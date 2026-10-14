from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APITestCase

from clientes.models import Cliente
from menu.models import Adicion, Categoria, Producto
from restaurantes.models import Restaurante


class BaseAPITestCase(APITestCase):
    def setUp(self):
        cache.clear()  # reinicia el límite de pedidos por hora
        self.restaurante = Restaurante.objects.create(
            nombre='Mr Lucho', direccion='Calle 1', latitud=10.9, longitud=-74.8,
            whatsapp_numero='3001234567', abierto=True
        )
        self.categoria = Categoria.objects.create(restaurante=self.restaurante, nombre='Hamburguesas')
        self.producto = Producto.objects.create(
            categoria=self.categoria, nombre='Sencilla', precio=Decimal('26000')
        )
        self.adicion = Adicion.objects.create(
            restaurante=self.restaurante, nombre='Francesa', precio=Decimal('8000')
        )
        self.cliente = Cliente.objects.create(
            telefono='3001112233', nombre='Ana', direccion='Calle 5 #6-7'
        )
        self.empleado = get_user_model().objects.create_user(
            username='empleado', password='clave-segura-123',
            restaurante=self.restaurante, rol='empleado'
        )

    def payload(self, **cambios):
        datos = {
            'cliente': str(self.cliente.id),
            'restaurante': str(self.restaurante.id),
            'observaciones': 'sin cebolla',
            'metodo_pago': 'efectivo',
            'detalles': [{
                'producto': str(self.producto.id),
                'cantidad': 2,
                'adiciones': [str(self.adicion.id)],
            }],
        }
        datos.update(cambios)
        return datos

    def crear_pedido(self, **cambios):
        return self.client.post('/api/pedidos/', self.payload(**cambios), format='json')

    def entrar_como_empleado(self):
        self.client.force_authenticate(self.empleado)

    def salir(self):
        self.client.force_authenticate(None)

    def assertSinAcceso(self, respuesta):
        self.assertIn(respuesta.status_code, (401, 403))