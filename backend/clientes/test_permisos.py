from core.testing import BaseAPITestCase


class ClientesPermisosTests(BaseAPITestCase):
    def test_sin_sesion_no_se_lista_ni_se_borra(self):
        self.assertSinAcceso(self.client.get('/api/clientes/'))
        self.assertSinAcceso(self.client.delete(f'/api/clientes/{self.cliente.telefono}/'))

    def test_la_tienda_sigue_buscando_y_creando_clientes(self):
        self.assertEqual(self.client.get(f'/api/clientes/{self.cliente.telefono}/').status_code, 200)
        nuevo = {'telefono': '3009998877', 'nombre': 'Luis', 'direccion': 'Calle 9'}
        self.assertEqual(self.client.post('/api/clientes/', nuevo, format='json').status_code, 201)

    def test_el_dueno_si_puede_listar(self):
        self.entrar_como_dueno()
        self.assertEqual(self.client.get('/api/clientes/').status_code, 200)