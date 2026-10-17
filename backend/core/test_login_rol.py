from django.contrib.auth import get_user_model

from core.testing import BaseAPITestCase


class LoginConRolTests(BaseAPITestCase):
    def test_el_login_informa_el_rol_del_dueno(self):
        r = self.client.post('/api/token/', {'username': 'dueno', 'password': 'clave-segura-123'})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['rol'], 'dueño')
        self.assertIn('access', r.data)

    def test_el_login_informa_el_rol_del_mesero(self):
        get_user_model().objects.create_user(
            username='mesero1', password='clave-segura-123',
            restaurante=self.restaurante, rol='mesero',
            first_name='Laura', last_name='Pérez'
        )
        r = self.client.post('/api/token/', {'username': 'mesero1', 'password': 'clave-segura-123'})
        self.assertEqual(r.data['rol'], 'mesero')
        self.assertEqual(r.data['nombre'], 'Laura Pérez')