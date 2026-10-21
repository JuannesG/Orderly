from datetime import timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.utils import timezone
from core.testing import BaseAPITestCase
from pedidos.models import Pedido
from menu.models import Producto
from pedidos.models import DetallePedido, Pedido

URL = '/api/estadisticas/resumen/'


class EstadisticasResumenTests(BaseAPITestCase):
    def hacer_pedido(self, total, estado='entregado', tipo='domicilio', hace_dias=0):
        pedido = Pedido.objects.create(
            restaurante=self.restaurante, estado=estado, tipo=tipo,
            subtotal=Decimal(total), total=Decimal(total),
        )
        if hace_dias:
            Pedido.objects.filter(pk=pedido.pk).update(
                creado_en=timezone.now() - timedelta(days=hace_dias)
            )
        return pedido

    def test_sin_sesion_no_entra(self):
        self.assertSinAcceso(self.client.get(URL))

    def test_mesera_no_entra(self):
        mesera = get_user_model().objects.create_user(
            username='mesera', password='clave-segura-123',
            restaurante=self.restaurante, rol='mesera'
        )
        self.client.force_authenticate(mesera)
        self.assertSinAcceso(self.client.get(URL))

    def test_solo_cuenta_pedidos_entregados(self):
        self.hacer_pedido('30000', tipo='domicilio')
        self.hacer_pedido('20000', tipo='local')
        self.hacer_pedido('50000', estado='rechazado')
        self.hacer_pedido('10000', estado='pendiente_verificacion')

        self.entrar_como_dueno()
        datos = self.client.get(URL).data

        self.assertEqual(datos['ventas_total'], 50000)
        self.assertEqual(datos['pedidos_entregados'], 2)
        self.assertEqual(datos['ticket_promedio'], 25000)
        self.assertEqual(datos['por_tipo']['domicilio'], {'pedidos': 1, 'ventas': 30000})
        self.assertEqual(datos['por_tipo']['local'], {'pedidos': 1, 'ventas': 20000})

    def test_sin_pedidos_devuelve_ceros(self):
        self.entrar_como_dueno()
        datos = self.client.get(URL).data

        self.assertEqual(datos['ventas_total'], 0)
        self.assertEqual(datos['pedidos_entregados'], 0)
        self.assertEqual(datos['ticket_promedio'], 0)

    def test_filtro_de_fechas(self):
        self.hacer_pedido('30000')
        self.hacer_pedido('40000', hace_dias=10)

        self.entrar_como_dueno()

        solo_hoy = self.client.get(URL).data
        self.assertEqual(solo_hoy['ventas_total'], 30000)

        desde = (timezone.localdate() - timedelta(days=15)).isoformat()
        amplio = self.client.get(URL, {'desde': desde}).data
        self.assertEqual(amplio['ventas_total'], 70000)

    def test_fechas_invalidas(self):
        self.entrar_como_dueno()

        self.assertEqual(self.client.get(URL, {'desde': 'hola'}).status_code, 400)
        self.assertEqual(
            self.client.get(URL, {'desde': '2026-10-20', 'hasta': '2026-10-01'}).status_code, 400
        )
        
class EstadisticasDetalleTests(BaseAPITestCase):
    URL = '/api/estadisticas/detalle/'

    def setUp(self):
        super().setUp()
        self.doble = Producto.objects.create(
            categoria=self.categoria, nombre='Doble', precio=Decimal('30000')
        )
        self.perro = Producto.objects.create(
            categoria=self.categoria, nombre='Perro', precio=Decimal('15000')
        )

    def pedido_con(self, producto, cantidad, estado='entregado'):
        pedido = Pedido.objects.create(
            restaurante=self.restaurante, estado=estado,
            subtotal=Decimal('1000'), total=Decimal('1000'),
        )
        DetallePedido.objects.create(
            pedido=pedido, producto=producto, cantidad=cantidad,
            precio_unitario=producto.precio,
        )
        return pedido

    def test_sin_sesion_no_entra(self):
        self.assertSinAcceso(self.client.get(self.URL))

    def test_mas_vendidos_solo_cuenta_entregados(self):
        self.pedido_con(self.producto, 3)
        self.pedido_con(self.doble, 1)
        self.pedido_con(self.doble, 10, estado='rechazado')

        self.entrar_como_dueno()
        datos = self.client.get(self.URL).data

        self.assertEqual(
            datos['mas_vendidos'],
            [{'nombre': 'Sencilla', 'unidades': 3}, {'nombre': 'Doble', 'unidades': 1}]
        )

    def test_menos_vendidos_incluye_los_que_no_se_vendieron(self):
        self.pedido_con(self.producto, 3)
        self.pedido_con(self.doble, 1)

        self.entrar_como_dueno()
        datos = self.client.get(self.URL).data

        nombres = [p['nombre'] for p in datos['menos_vendidos']]
        self.assertEqual(nombres, ['Perro', 'Doble', 'Sencilla'])
        self.assertEqual(datos['menos_vendidos'][0]['unidades'], 0)

    def test_horas_pico(self):
        pedido = self.pedido_con(self.producto, 1)
        dos_y_media = timezone.localtime().replace(hour=14, minute=30, second=0, microsecond=0)
        Pedido.objects.filter(pk=pedido.pk).update(creado_en=dos_y_media)

        self.entrar_como_dueno()
        datos = self.client.get(self.URL).data

        self.assertEqual(len(datos['horas']), 24)
        self.assertEqual(datos['horas'][14], {'hora': 14, 'pedidos': 1})
        self.assertEqual(datos['horas'][15]['pedidos'], 0)        