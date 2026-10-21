from decimal import Decimal

from django.contrib.auth import get_user_model

from core.testing import BaseAPITestCase
from pedidos.models import Pedido
from restaurantes.models import Restaurante

Usuario = get_user_model()
URL = '/api/usuarios/'
CLAVE = 'clave-segura-123'


class UsuariosTests(BaseAPITestCase):
    def setUp(self):
        super().setUp()
        self.mesera = Usuario.objects.create_user(
            username='mesera1', password=CLAVE, first_name='Ana', last_name='Pérez',
            restaurante=self.restaurante, rol='mesera',
        )
        self.domicilios = Usuario.objects.create_user(
            username='domi1', password=CLAVE, first_name='Luis', last_name='Mora',
            restaurante=self.restaurante, rol='domicilios',
        )
        self.otro_restaurante = Restaurante.objects.create(
            nombre='Otro', direccion='Calle 9', latitud=10.9, longitud=-74.8,
            whatsapp_numero='3000000000', abierto=True,
        )
        self.ajeno = Usuario.objects.create_user(
            username='ajeno', password=CLAVE, restaurante=self.otro_restaurante, rol='mesera',
        )
        self.super = Usuario.objects.create_superuser(
            username='root', email='root@ejemplo.co', password=CLAVE,
            restaurante=self.restaurante, rol='dueño',
        )
        self.entrar_como_dueno()

    def datos(self, **cambios):
        datos = {
            'username': 'nueva', 'first_name': 'Laura', 'last_name': 'Gómez',
            'rol': 'mesera', 'password': 'Tr0pical-2026-xyz',
        }
        datos.update(cambios)
        return datos

    def login(self, usuario, clave):
        return self.client.post('/api/token/', {'username': usuario, 'password': clave}, format='json')

    def test_solo_el_dueno_entra(self):
        self.salir()
        self.assertSinAcceso(self.client.get(URL))
        for usuario in (self.mesera, self.domicilios):
            self.client.force_authenticate(usuario)
            self.assertSinAcceso(self.client.get(URL))
            self.assertSinAcceso(self.client.post(URL, self.datos(), format='json'))

    def test_lista_solo_su_restaurante_y_sin_superusuarios(self):
        respuesta = self.client.get(URL)
        self.assertEqual(respuesta.status_code, 200)
        nombres = {u['username'] for u in respuesta.data}
        self.assertEqual(nombres, {'dueno', 'mesera1', 'domi1'})

    def test_marca_cual_es_mi_cuenta(self):
        respuesta = self.client.get(URL)
        propias = [u['username'] for u in respuesta.data if u['es_yo']]
        self.assertEqual(propias, ['dueno'])        

    def test_crear_asigna_restaurante_y_la_clave_sirve(self):
        respuesta = self.client.post(
            URL, self.datos(restaurante=str(self.otro_restaurante.id)), format='json'
        )
        self.assertEqual(respuesta.status_code, 201)
        self.assertNotIn('password', respuesta.data)

        nuevo = Usuario.objects.get(username='nueva')
        self.assertEqual(nuevo.restaurante, self.restaurante)
        self.assertNotEqual(nuevo.password, 'Tr0pical-2026-xyz')

        self.salir()
        entrada = self.login('nueva', 'Tr0pical-2026-xyz')
        self.assertEqual(entrada.status_code, 200)
        self.assertEqual(entrada.data['rol'], 'mesera')

    def test_crear_rechaza_datos_malos(self):
        casos = (
            {'password': '12345678'},
            {'username': 'mesera1'},
            {'rol': 'jefe'},
            {'last_name': ''},
        )
        for malos in casos:
            respuesta = self.client.post(URL, self.datos(**malos), format='json')
            self.assertEqual(respuesta.status_code, 400, malos)

    def test_editar_nombre_y_rol(self):
        respuesta = self.client.patch(
            f'{URL}{self.mesera.id}/', {'first_name': 'Anita', 'rol': 'domicilios'}, format='json'
        )
        self.assertEqual(respuesta.status_code, 200)
        self.mesera.refresh_from_db()
        self.assertEqual(self.mesera.first_name, 'Anita')
        self.assertEqual(self.mesera.rol, 'domicilios')

    def test_no_cambia_su_propio_rol(self):
        respuesta = self.client.patch(f'{URL}{self.dueno.id}/', {'rol': 'mesera'}, format='json')
        self.assertEqual(respuesta.status_code, 400)
        self.dueno.refresh_from_db()
        self.assertEqual(self.dueno.rol, 'dueño')

    def test_ajenos_y_superusuarios_no_se_tocan(self):
        for intocable in (self.ajeno, self.super):
            base = f'{URL}{intocable.id}/'
            self.assertEqual(self.client.patch(base, {'first_name': 'X'}, format='json').status_code, 404)
            self.assertEqual(self.client.delete(base).status_code, 404)
            self.assertEqual(self.client.post(f'{base}desactivar/').status_code, 404)
            self.assertEqual(
                self.client.post(f'{base}clave/', {'password': 'Otra-Clave-5555'}, format='json').status_code, 404
            )

    def test_desactivar_y_reactivar(self):
        respuesta = self.client.post(f'{URL}{self.mesera.id}/desactivar/')
        self.assertEqual(respuesta.status_code, 200)
        self.mesera.refresh_from_db()
        self.assertFalse(self.mesera.is_active)

        self.salir()
        self.assertEqual(self.login('mesera1', CLAVE).status_code, 401)

        self.entrar_como_dueno()
        self.client.post(f'{URL}{self.mesera.id}/reactivar/')
        self.mesera.refresh_from_db()
        self.assertTrue(self.mesera.is_active)

    def test_no_se_desactiva_a_si_mismo(self):
        respuesta = self.client.post(f'{URL}{self.dueno.id}/desactivar/')
        self.assertEqual(respuesta.status_code, 400)
        self.dueno.refresh_from_db()
        self.assertTrue(self.dueno.is_active)

    def test_sesion_abierta_se_corta_al_desactivar(self):
        self.salir()
        token = self.login('mesera1', CLAVE).data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(self.client.get('/api/pedidos/en-local/').status_code, 200)

        Usuario.objects.filter(pk=self.mesera.pk).update(is_active=False)

        self.assertSinAcceso(self.client.get('/api/pedidos/en-local/'))
        self.client.credentials()

    def test_cambiar_clave(self):
        base = f'{URL}{self.mesera.id}/clave/'
        debil = self.client.post(base, {'password': '1234'}, format='json')
        self.assertEqual(debil.status_code, 400)

        buena = self.client.post(base, {'password': 'Nueva-Clave-9876'}, format='json')
        self.assertEqual(buena.status_code, 200)

        self.salir()
        self.assertEqual(self.login('mesera1', CLAVE).status_code, 401)
        self.assertEqual(self.login('mesera1', 'Nueva-Clave-9876').status_code, 200)

    def test_eliminar(self):
        propio = self.client.delete(f'{URL}{self.dueno.id}/')
        self.assertEqual(propio.status_code, 400)

        Pedido.objects.create(
            restaurante=self.restaurante, tipo='local', zona='salon', mesa='1',
            estado='aceptado', subtotal=Decimal('0'), total=Decimal('0'), mesera=self.mesera,
        )
        con_historial = self.client.delete(f'{URL}{self.mesera.id}/')
        self.assertEqual(con_historial.status_code, 409)
        self.assertTrue(Usuario.objects.filter(pk=self.mesera.pk).exists())

        sin_historial = self.client.delete(f'{URL}{self.domicilios.id}/')
        self.assertEqual(sin_historial.status_code, 204)
        self.assertFalse(Usuario.objects.filter(pk=self.domicilios.pk).exists())

    def test_sesion_se_cierra_al_cambiar_clave(self):
        self.salir()
        entrada = self.login('mesera1', CLAVE)
        acceso, refresco = entrada.data['access'], entrada.data['refresh']

        self.entrar_como_dueno()
        cambio = self.client.post(
            f'{URL}{self.mesera.id}/clave/', {'password': 'Nueva-Clave-9876'}, format='json'
        )
        self.assertEqual(cambio.status_code, 200)

        self.salir()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {acceso}')
        self.assertSinAcceso(self.client.get('/api/pedidos/en-local/'))
        self.client.credentials()

        renovar = self.client.post('/api/token/refresh/', {'refresh': refresco}, format='json')
        self.assertEqual(renovar.status_code, 401)

    def test_primer_ingreso_obliga_a_cambiar_la_clave(self):
        self.client.post(URL, self.datos(), format='json')
        self.salir()

        entrada = self.login('nueva', 'Tr0pical-2026-xyz')
        self.assertTrue(entrada.data['debe_cambiar_clave'])
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {entrada.data['access']}")

        # Con la clave temporal solo puede usar la ruta de cambio.
        self.assertSinAcceso(self.client.get('/api/pedidos/en-local/'))

        ruta = '/api/cuenta/clave/'
        mala = self.client.post(
            ruta, {'clave_actual': 'equivocada', 'clave_nueva': 'Mi-Clave-Propia-77'}, format='json'
        )
        self.assertEqual(mala.status_code, 400)

        igual = self.client.post(
            ruta, {'clave_actual': 'Tr0pical-2026-xyz', 'clave_nueva': 'Tr0pical-2026-xyz'}, format='json'
        )
        self.assertEqual(igual.status_code, 400)

        debil = self.client.post(
            ruta, {'clave_actual': 'Tr0pical-2026-xyz', 'clave_nueva': '1234'}, format='json'
        )
        self.assertEqual(debil.status_code, 400)

        buena = self.client.post(
            ruta, {'clave_actual': 'Tr0pical-2026-xyz', 'clave_nueva': 'Mi-Clave-Propia-77'}, format='json'
        )
        self.assertEqual(buena.status_code, 200)
        self.assertFalse(buena.data['debe_cambiar_clave'])

        # Con los tokens nuevos ya tiene acceso normal.
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {buena.data['access']}")
        self.assertEqual(self.client.get('/api/pedidos/en-local/').status_code, 200)
        self.client.credentials()

        self.assertEqual(self.login('nueva', 'Tr0pical-2026-xyz').status_code, 401)
        nueva_entrada = self.login('nueva', 'Mi-Clave-Propia-77')
        self.assertEqual(nueva_entrada.status_code, 200)
        self.assertFalse(nueva_entrada.data['debe_cambiar_clave'])

    def test_clave_puesta_por_el_dueno_obliga_a_cambiarla_pero_la_propia_no(self):
        self.client.post(
            f'{URL}{self.mesera.id}/clave/', {'password': 'Nueva-Clave-9876'}, format='json'
        )
        self.client.post(
            f'{URL}{self.dueno.id}/clave/', {'password': 'Parrilla-Mixta-5521'}, format='json'
        )
        self.salir()

        self.assertTrue(self.login('mesera1', 'Nueva-Clave-9876').data['debe_cambiar_clave'])
        self.assertFalse(self.login('dueno', 'Parrilla-Mixta-5521').data['debe_cambiar_clave'])        