from django.contrib.auth import get_user_model

from core.testing import BaseAPITestCase
from pedidos.models import Pedido


class PedidoLocalTests(BaseAPITestCase):
    def setUp(self):
        super().setUp()
        self.mesera = get_user_model().objects.create_user(
            username='mesera1', password='clave-segura-123',
            restaurante=self.restaurante, rol='mesera'
        )

    def datos(self, **cambios):
        datos = {
            'zona': 'salon',
            'mesa': '5',
            'observaciones': 'sin cebolla',
            'detalles': [{
                'producto': str(self.producto.id),
                'cantidad': 2,
                'adiciones': [str(self.adicion.id)],
            }],
        }
        datos.update(cambios)
        return datos

    def crear(self, **cambios):
        return self.client.post('/api/pedidos/local/', self.datos(**cambios), format='json')

    def test_mesera_crea_pedido_en_el_salon(self):
        self.client.force_authenticate(self.mesera)
        self.assertEqual(self.crear().status_code, 201)
        pedido = Pedido.objects.get()
        self.assertEqual(pedido.tipo, 'local')
        self.assertEqual(pedido.mesera, self.mesera)
        self.assertIsNone(pedido.cliente)
        self.assertEqual(pedido.estado, 'aceptado')
        self.assertEqual(pedido.costo_domicilio, 0)
        self.assertEqual(pedido.total, 68000)
        self.assertEqual(pedido.detalles.count(), 1)

    def test_sin_sesion_no_puede_crear(self):
        self.assertSinAcceso(self.crear())
        self.assertEqual(Pedido.objects.count(), 0)

    def test_domicilios_no_puede_crear_pedidos_del_local(self):
        domicilios = get_user_model().objects.create_user(
            username='domi1', password='clave-segura-123',
            restaurante=self.restaurante, rol='domicilios'
        )
        self.client.force_authenticate(domicilios)
        self.assertEqual(self.crear().status_code, 403)

    def test_para_llevar_exige_referencia(self):
        self.client.force_authenticate(self.mesera)
        self.assertEqual(self.crear(zona='para_llevar', mesa='').status_code, 400)
        r = self.crear(zona='para_llevar', mesa='', nota='Carlos moto roja')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(Pedido.objects.get().mesa, '')

    def test_la_mesa_debe_existir_en_la_zona(self):
        self.client.force_authenticate(self.mesera)
        self.assertEqual(self.crear(zona='salon', mesa='18').status_code, 400)
        self.assertEqual(self.crear(zona='terraza', mesa='A12').status_code, 400)
        self.assertEqual(self.crear(zona='salon', mesa='A3').status_code, 400)
        self.assertEqual(self.crear(zona='terraza', mesa='a3').status_code, 201)
        self.assertEqual(Pedido.objects.get().mesa, 'A3')

    def test_se_puede_tomar_pedido_con_la_tienda_cerrada(self):
        self.restaurante.abierto = False
        self.restaurante.save()
        self.client.force_authenticate(self.mesera)
        self.assertEqual(self.crear().status_code, 201)

    def test_el_servidor_decide_el_precio_y_el_mesera(self):
        self.client.force_authenticate(self.mesera)
        r = self.crear(total=1, subtotal=1, mesera=str(self.dueno.id))
        self.assertEqual(r.status_code, 201)
        pedido = Pedido.objects.get()
        self.assertEqual(pedido.total, 68000)
        self.assertEqual(pedido.mesera, self.mesera)