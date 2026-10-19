from core.testing import BaseAPITestCase


class DisponibilidadTests(BaseAPITestCase):
    def test_el_dueno_desactiva_un_producto_y_ya_no_se_puede_pedir(self):
        self.entrar_como_dueno()
        ruta = f'/api/productos/{self.producto.id}/'
        self.assertEqual(self.client.patch(ruta, {'disponible': False}, format='json').status_code, 200)

        self.salir()
        self.assertEqual(self.crear_pedido().status_code, 400)

    def test_un_cliente_no_puede_cambiar_la_disponibilidad(self):
        ruta = f'/api/productos/{self.producto.id}/'
        self.assertSinAcceso(self.client.patch(ruta, {'disponible': False}, format='json'))