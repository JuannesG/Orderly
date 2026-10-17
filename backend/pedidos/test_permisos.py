from django.test import TestCase
from rest_framework.test import APIClient

from usuarios.models import Usuario


class PermisosPorRolTests(TestCase):
    def setUp(self):
        self.api = APIClient()

    def entrar_como(self, rol):
        usuario = Usuario.objects.create_user(
            username=f'prueba_{rol}', password='clave-de-prueba-123', rol=rol
        )
        self.api.force_authenticate(user=usuario)

    def test_mesero_no_puede_listar_pedidos(self):
        self.entrar_como('mesero')
        respuesta = self.api.get('/api/pedidos/')
        self.assertEqual(respuesta.status_code, 403)

    def test_mesero_no_puede_ver_el_dashboard(self):
        self.entrar_como('mesero')
        respuesta = self.api.get('/api/dashboard/resumen/')
        self.assertEqual(respuesta.status_code, 403)

    def test_domicilios_si_puede_listar_pedidos(self):
        self.entrar_como('domicilios')
        respuesta = self.api.get('/api/pedidos/')
        self.assertEqual(respuesta.status_code, 200)

    def test_dueno_si_puede_listar_pedidos(self):
        self.entrar_como('dueño')
        respuesta = self.api.get('/api/pedidos/')
        self.assertEqual(respuesta.status_code, 200)

    def test_domicilios_no_puede_ver_el_dashboard(self):
        self.entrar_como('domicilios')
        self.assertEqual(self.api.get('/api/dashboard/resumen/').status_code, 403)

    def test_mesero_no_puede_ver_pagos(self):
        self.entrar_como('mesero')
        self.assertEqual(self.api.get('/api/pagos/').status_code, 403)

    def test_mesero_no_puede_crear_categorias(self):
        self.entrar_como('mesero')
        respuesta = self.api.post('/api/categorias/', {'nombre': 'Prueba'}, format='json')
        self.assertEqual(respuesta.status_code, 403)    