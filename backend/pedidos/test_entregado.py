from core.testing import BaseAPITestCase
from pagos.models import Pago
from pedidos.models import Pedido


class PedidoEntregadoTests(BaseAPITestCase):
    def test_un_pedido_entregado_no_se_puede_modificar(self):
        token = self.crear_pedido().data['token_seguimiento']
        self.entrar_como_dueno()
        ruta = f'/api/pedidos/{token}/'
        self.assertEqual(self.client.patch(ruta, {'estado': 'aceptado'}, format='json').status_code, 200)
        self.assertEqual(self.client.patch(ruta, {'estado': 'entregado'}, format='json').status_code, 200)

        respuesta = self.client.patch(ruta, {'estado': 'aceptado'}, format='json')
        self.assertEqual(respuesta.status_code, 409)
        self.assertEqual(Pedido.objects.get().estado, 'entregado')

    def test_el_pago_de_un_pedido_entregado_no_se_modifica(self):
        token = self.crear_pedido(metodo_pago='nequi').data['token_seguimiento']
        self.entrar_como_dueno()
        self.client.patch(f'/api/pedidos/{token}/', {'estado': 'entregado'}, format='json')

        pago = Pago.objects.get()
        ruta = f'/api/pagos/{pago.id}/'
        respuesta = self.client.patch(ruta, {'estado_verificacion': 'aceptado'}, format='json')
        self.assertEqual(respuesta.status_code, 409)
        pago.refresh_from_db()
        self.assertEqual(pago.estado_verificacion, 'pendiente_verificacion')