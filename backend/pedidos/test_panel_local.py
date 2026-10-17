from django.contrib.auth import get_user_model

from core.testing import BaseAPITestCase
from pedidos.models import Pedido


class PanelLocalTests(BaseAPITestCase):
    def setUp(self):
        super().setUp()
        Usuario = get_user_model()
        self.mesera1 = Usuario.objects.create_user(
            username='mesera1', password='clave-segura-123',
            restaurante=self.restaurante, rol='mesera'
        )
        self.mesera2 = Usuario.objects.create_user(
            username='mesera2', password='clave-segura-123',
            restaurante=self.restaurante, rol='mesera'
        )
        self.domicilios = Usuario.objects.create_user(
            username='domi1', password='clave-segura-123',
            restaurante=self.restaurante, rol='domicilios'
        )

    def tomar_pedido(self, mesera, mesa='5'):
        self.client.force_authenticate(mesera)
        r = self.client.post('/api/pedidos/local/', {
            'zona': 'salon',
            'mesa': mesa,
            'metodo_pago_local': 'efectivo',
            'detalles': [{'producto': str(self.producto.id), 'cantidad': 1}],
        }, format='json')
        self.assertEqual(r.status_code, 201)
        return Pedido.objects.get(id=r.data['id'])

    def test_mesera_ve_todos_y_filtra_los_suyos(self):
        self.tomar_pedido(self.mesera1, '1')
        self.tomar_pedido(self.mesera2, '2')
        self.client.force_authenticate(self.mesera1)
        self.assertEqual(len(self.client.get('/api/pedidos/en-local/').data), 2)
        mios = self.client.get('/api/pedidos/en-local/?mios=1').data
        self.assertEqual(len(mios), 1)
        self.assertEqual(mios[0]['mesera_nombre'], 'mesera1')

    def test_domicilios_y_visitantes_no_ven_el_local(self):
        self.tomar_pedido(self.mesera1)
        self.client.force_authenticate(self.domicilios)
        self.assertEqual(self.client.get('/api/pedidos/en-local/').status_code, 403)
        self.salir()
        self.assertSinAcceso(self.client.get('/api/pedidos/en-local/'))

    def test_imprimir_pasa_a_preparacion_y_reimprimir_no_cambia_nada(self):
        pedido = self.tomar_pedido(self.mesera1)
        self.client.force_authenticate(self.mesera1)
        ruta = f'/api/pedidos/{pedido.token_seguimiento}/imprimir/'
        self.assertEqual(self.client.post(ruta).status_code, 200)
        pedido.refresh_from_db()
        self.assertEqual(pedido.estado, 'en_preparacion')
        self.assertEqual(self.client.post(ruta).status_code, 200)
        pedido.refresh_from_db()
        self.assertEqual(pedido.estado, 'en_preparacion')

    def test_entregado_cierra_el_pedido_del_local(self):
        pedido = self.tomar_pedido(self.mesera1)
        self.client.force_authenticate(self.mesera1)
        base = f'/api/pedidos/{pedido.token_seguimiento}/'
        self.assertEqual(self.client.post(base + 'imprimir/').status_code, 200)
        self.assertEqual(self.client.post(base + 'entregado/').status_code, 200)
        self.assertEqual(self.client.post(base + 'entregado/').status_code, 200)  # doble toque
        self.assertEqual(self.client.post(base + 'imprimir/').status_code, 200)   # reimprimir
        pedido.refresh_from_db()
        self.assertEqual(pedido.estado, 'entregado')

        self.entrar_como_dueno()
        respuesta = self.client.patch(base, {'estado': 'aceptado'}, format='json')
        self.assertEqual(respuesta.status_code, 409)

    def test_activos_oculta_los_entregados(self):
        p1 = self.tomar_pedido(self.mesera1, '1')
        self.tomar_pedido(self.mesera1, '2')
        self.client.post(f'/api/pedidos/{p1.token_seguimiento}/entregado/')
        self.assertEqual(len(self.client.get('/api/pedidos/en-local/?filtro=activos').data), 1)
        self.assertEqual(len(self.client.get('/api/pedidos/en-local/?filtro=hoy').data), 2)
        self.assertEqual(len(self.client.get('/api/pedidos/en-local/?filtro=todos').data), 2)

    def test_domicilios_imprime_un_domicilio_aceptado(self):
        token = self.crear_pedido().data['token_seguimiento']
        self.entrar_como_dueno()
        self.client.patch(f'/api/pedidos/{token}/', {'estado': 'aceptado'}, format='json')
        ruta = f'/api/pedidos/{token}/imprimir/'

        self.client.force_authenticate(self.mesera1)
        self.assertEqual(self.client.post(ruta).status_code, 403)

        self.client.force_authenticate(self.domicilios)
        self.assertEqual(self.client.post(ruta).status_code, 200)
        self.assertEqual(Pedido.objects.get().estado, 'en_preparacion')

    def test_mesera_no_usa_el_cambio_de_estado_general(self):
        pedido = self.tomar_pedido(self.mesera1)
        ruta = f'/api/pedidos/{pedido.token_seguimiento}/'
        respuesta = self.client.patch(ruta, {'estado': 'entregado'}, format='json')
        self.assertEqual(respuesta.status_code, 403)
        pedido.refresh_from_db()
        self.assertEqual(pedido.estado, 'aceptado')

    def test_la_lista_general_solo_trae_domicilios(self):
        self.tomar_pedido(self.mesera1)
        self.crear_pedido()
        self.entrar_como_dueno()
        r = self.client.get('/api/pedidos/')
        self.assertEqual(r.status_code, 200)
        datos = r.data['results'] if isinstance(r.data, dict) else r.data
        self.assertEqual(len(datos), 1)    