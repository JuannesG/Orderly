import shutil
import tempfile
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings

from clientes.models import Cliente
from core.testing import BaseAPITestCase
from menu.models import Categoria, Producto
from pedidos.models import Pedido
from restaurantes.models import Restaurante

MEDIA_TMP = tempfile.mkdtemp()


class CrearPedidoTests(BaseAPITestCase):
    def test_cliente_sin_login_puede_crear_pedido(self):
        r = self.crear_pedido()
        self.assertEqual(r.status_code, 201)
        self.assertEqual(Pedido.objects.count(), 1)

    def test_el_servidor_calcula_los_precios(self):
        # El cliente intenta mandar precios falsos: el servidor debe ignorarlos
        r = self.crear_pedido(
            subtotal='1', total='1', costo_domicilio='0',
            detalles=[{
                'producto': str(self.producto.id), 'cantidad': 2,
                'precio_unitario': '1', 'adiciones': [str(self.adicion.id)],
            }]
        )
        self.assertEqual(r.status_code, 201)
        pedido = Pedido.objects.get()
        self.assertEqual(pedido.subtotal, Decimal('68000'))      # (26000 + 8000) x 2
        self.assertEqual(pedido.costo_domicilio, Decimal('3000'))
        self.assertEqual(pedido.total, Decimal('71000'))
        self.assertEqual(pedido.detalles.get().precio_unitario, Decimal('26000'))

    def test_pedido_en_efectivo_queda_pendiente_de_aceptar(self):
        self.crear_pedido(metodo_pago='efectivo')
        pedido = Pedido.objects.get()
        self.assertEqual(pedido.estado, 'pendiente_verificacion')
        self.assertEqual(pedido.pago.estado_verificacion, 'aceptado')

    def test_pedido_por_transferencia_queda_con_pago_pendiente(self):
        self.crear_pedido(metodo_pago='nequi')
        pedido = Pedido.objects.get()
        self.assertEqual(pedido.estado, 'pendiente_verificacion')
        self.assertEqual(pedido.pago.estado_verificacion, 'pendiente_verificacion')

    def test_rechaza_si_el_restaurante_esta_cerrado(self):
        self.restaurante.abierto = False
        self.restaurante.save()
        self.assertEqual(self.crear_pedido().status_code, 400)
        self.assertEqual(Pedido.objects.count(), 0)

    def test_rechaza_producto_no_disponible(self):
        self.producto.disponible = False
        self.producto.save()
        self.assertEqual(self.crear_pedido().status_code, 400)

    def test_rechaza_cantidades_invalidas(self):
        for cantidad in (0, -1, 51):
            r = self.crear_pedido(detalles=[
                {'producto': str(self.producto.id), 'cantidad': cantidad, 'adiciones': []}
            ])
            self.assertEqual(r.status_code, 400, f'cantidad {cantidad}')

    def test_rechaza_pedido_sin_productos(self):
        self.assertEqual(self.crear_pedido(detalles=[]).status_code, 400)

    def test_rechaza_metodo_de_pago_invalido(self):
        self.assertEqual(self.crear_pedido(metodo_pago='bitcoin').status_code, 400)

    def test_rechaza_observaciones_muy_largas(self):
        self.assertEqual(self.crear_pedido(observaciones='x' * 301).status_code, 400)

    def test_rechaza_producto_de_otro_restaurante(self):
        otro = Restaurante.objects.create(
            nombre='Otro', direccion='Calle 9', latitud=1, longitud=1, whatsapp_numero='3000000000'
        )
        categoria = Categoria.objects.create(restaurante=otro, nombre='Otra')
        ajeno = Producto.objects.create(categoria=categoria, nombre='Ajeno', precio=Decimal('1000'))
        r = self.crear_pedido(detalles=[
            {'producto': str(ajeno.id), 'cantidad': 1, 'adiciones': []}
        ])
        self.assertEqual(r.status_code, 400)

    def test_limite_de_pedidos_por_hora(self):
        for _ in range(30):
            self.assertEqual(self.crear_pedido().status_code, 201)
        self.assertEqual(self.crear_pedido().status_code, 429)


class ConsultaPedidoTests(BaseAPITestCase):
    def test_el_cliente_ve_su_pedido_con_el_token(self):
        token = self.crear_pedido().data['token_seguimiento']
        r = self.client.get(f'/api/pedidos/{token}/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(Decimal(r.data['total']), Decimal('71000'))

    def test_token_inexistente_da_404(self):
        r = self.client.get('/api/pedidos/00000000-0000-0000-0000-000000000000/')
        self.assertEqual(r.status_code, 404)

    def test_mis_pedidos_solo_devuelve_los_de_ese_telefono(self):
        otro = Cliente.objects.create(telefono='3009998877', nombre='Luis', direccion='Otra')
        self.crear_pedido()
        self.crear_pedido(cliente=str(otro.id))
        r = self.client.get('/api/pedidos/mios/', {'telefono': '3001112233'})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 1)

    def test_mis_pedidos_sin_telefono_devuelve_lista_vacia(self):
        self.crear_pedido()
        r = self.client.get('/api/pedidos/mios/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 0)


@override_settings(MEDIA_ROOT=MEDIA_TMP)
class ComprobanteTests(BaseAPITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA_TMP, ignore_errors=True)

    def subir(self, token, archivo):
        return self.client.post(
            f'/api/pedidos/{token}/comprobante/', {'comprobante': archivo}, format='multipart'
        )

    def imagen(self, nombre='comprobante.png', tipo='image/png', contenido=b'imagen-de-prueba'):
        return SimpleUploadedFile(nombre, contenido, content_type=tipo)

    def test_acepta_una_imagen_en_pedido_por_transferencia(self):
        token = self.crear_pedido(metodo_pago='nequi').data['token_seguimiento']
        self.assertEqual(self.subir(token, self.imagen()).status_code, 200)
        self.assertTrue(Pedido.objects.get().pago.comprobante)

    def test_rechaza_archivos_que_no_son_imagen(self):
        token = self.crear_pedido(metodo_pago='nequi').data['token_seguimiento']
        malo = SimpleUploadedFile('virus.exe', b'MZ...', content_type='application/octet-stream')
        self.assertEqual(self.subir(token, malo).status_code, 400)

    def test_rechaza_imagenes_de_mas_de_5mb(self):
        token = self.crear_pedido(metodo_pago='nequi').data['token_seguimiento']
        grande = self.imagen(contenido=b'0' * (5 * 1024 * 1024 + 1))
        self.assertEqual(self.subir(token, grande).status_code, 400)

    def test_rechaza_comprobante_en_pedido_de_efectivo(self):
        token = self.crear_pedido(metodo_pago='efectivo').data['token_seguimiento']
        self.assertEqual(self.subir(token, self.imagen()).status_code, 400)