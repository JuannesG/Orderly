from datetime import date

from core.testing import BaseAPITestCase
from menu.models import Categoria, Producto
from pagos.models import Pago
from pedidos.models import Pedido


class MenuPublicoTests(BaseAPITestCase):
    def test_cualquiera_puede_ver_el_menu(self):
        for ruta in ('/api/categorias/', '/api/productos/', '/api/adiciones/', '/api/restaurantes/'):
            self.assertEqual(self.client.get(ruta).status_code, 200, ruta)

    def test_el_cliente_no_puede_modificar_el_menu(self):
        self.assertSinAcceso(self.client.post('/api/categorias/', {'nombre': 'Hack'}))
        self.assertSinAcceso(self.client.post('/api/adiciones/', {'nombre': 'Hack', 'precio': '1'}))
        self.assertSinAcceso(self.client.patch(f'/api/productos/{self.producto.id}/', {'precio': '1'}))
        self.assertSinAcceso(self.client.delete(f'/api/productos/{self.producto.id}/'))
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.precio, 26000)

    def test_empleado_crea_categoria_sin_enviar_restaurante(self):
        self.entrar_como_empleado()
        r = self.client.post('/api/categorias/', {'nombre': 'Promociones'})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(Categoria.objects.get(nombre='Promociones').restaurante, self.restaurante)

    def test_no_se_borra_lo_que_ya_aparece_en_pedidos(self):
        self.crear_pedido()
        self.entrar_como_empleado()
        r = self.client.delete(f'/api/productos/{self.producto.id}/')
        self.assertEqual(r.status_code, 409)
        r = self.client.delete(f'/api/categorias/{self.categoria.id}/')
        self.assertEqual(r.status_code, 409)
        self.assertTrue(Producto.objects.filter(id=self.producto.id).exists())


class PermisosDelRestauranteTests(BaseAPITestCase):
    def test_el_cliente_no_puede_cerrar_la_tienda(self):
        ruta = f'/api/restaurantes/{self.restaurante.id}/'
        self.assertSinAcceso(self.client.patch(ruta, {'abierto': False}))
        self.restaurante.refresh_from_db()
        self.assertTrue(self.restaurante.abierto)

        self.entrar_como_empleado()
        self.assertEqual(self.client.patch(ruta, {'abierto': False}).status_code, 200)
        self.restaurante.refresh_from_db()
        self.assertFalse(self.restaurante.abierto)

    def test_el_cliente_no_puede_ver_la_lista_de_pedidos(self):
        self.crear_pedido()
        self.assertSinAcceso(self.client.get('/api/pedidos/'))
        self.entrar_como_empleado()
        self.assertEqual(self.client.get('/api/pedidos/').status_code, 200)

    def test_solo_el_empleado_cambia_el_estado_de_un_pedido(self):
        token = self.crear_pedido().data['token_seguimiento']
        ruta = f'/api/pedidos/{token}/'
        self.assertSinAcceso(self.client.patch(ruta, {'estado': 'entregado'}, format='json'))
        self.assertEqual(Pedido.objects.get().estado, 'pendiente_verificacion')

        self.entrar_como_empleado()
        self.assertEqual(self.client.patch(ruta, {'estado': 'aceptado'}, format='json').status_code, 200)
        self.assertEqual(Pedido.objects.get().estado, 'aceptado')

    def test_el_cliente_no_puede_borrar_pedidos(self):
        token = self.crear_pedido().data['token_seguimiento']
        self.assertSinAcceso(self.client.delete(f'/api/pedidos/{token}/'))
        self.assertEqual(Pedido.objects.count(), 1)

    def test_el_cliente_no_puede_aprobar_su_propio_pago(self):
        self.crear_pedido(metodo_pago='nequi')
        pago = Pago.objects.get()
        ruta = f'/api/pagos/{pago.id}/'
        self.assertSinAcceso(self.client.patch(ruta, {'estado_verificacion': 'aceptado'}, format='json'))
        self.assertSinAcceso(self.client.get('/api/pagos/'))
        pago.refresh_from_db()
        self.assertEqual(pago.estado_verificacion, 'pendiente_verificacion')

    def test_dashboard_y_reservas_exigen_login(self):
        self.assertSinAcceso(self.client.get('/api/dashboard/resumen/'))
        self.assertSinAcceso(self.client.get('/api/reservas/'))

        self.entrar_como_empleado()
        self.assertEqual(self.client.get('/api/dashboard/resumen/').status_code, 200)
        reserva = {
            'restaurante': str(self.restaurante.id), 'nombre_cliente': 'Carlos',
            'telefono': '3001234567', 'fecha': date.today().isoformat(),
            'hora': '19:00', 'numero_personas': 4, 'motivo': 'Cumpleaños',
        }
        self.assertEqual(self.client.post('/api/reservas/', reserva, format='json').status_code, 201)


class AutenticacionTests(BaseAPITestCase):
    def test_login_correcto_devuelve_tokens(self):
        r = self.client.post('/api/token/', {'username': 'empleado', 'password': 'clave-segura-123'})
        self.assertEqual(r.status_code, 200)
        self.assertIn('access', r.data)
        self.assertIn('refresh', r.data)

    def test_login_con_clave_incorrecta_falla(self):
        r = self.client.post('/api/token/', {'username': 'empleado', 'password': 'incorrecta'})
        self.assertEqual(r.status_code, 401)

    def test_token_vencido_no_rompe_las_rutas_publicas(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer token.vencido.o.falso')
        self.assertEqual(self.client.get('/api/categorias/').status_code, 200)
        self.assertSinAcceso(self.client.get('/api/pedidos/'))