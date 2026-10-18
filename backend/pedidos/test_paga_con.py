from core.testing import BaseAPITestCase
from pedidos.models import Pedido


class PagaConTests(BaseAPITestCase):
    def test_efectivo_guarda_con_cuanto_paga(self):
        r = self.crear_pedido(paga_con=100000)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(Pedido.objects.get().paga_con, 100000)

    def test_el_billete_debe_alcanzar_para_el_total(self):
        r = self.crear_pedido(paga_con=1000)
        self.assertEqual(r.status_code, 400)
        self.assertEqual(Pedido.objects.count(), 0)

    def test_pago_exacto_o_sin_dato_queda_vacio(self):
        self.assertEqual(self.crear_pedido().status_code, 201)
        self.assertEqual(self.crear_pedido(paga_con=None).status_code, 201)
        self.assertTrue(all(p.paga_con is None for p in Pedido.objects.all()))

    def test_con_transferencia_se_ignora_el_billete(self):
        r = self.crear_pedido(metodo_pago='nequi', paga_con=100000)
        self.assertEqual(r.status_code, 201)
        self.assertIsNone(Pedido.objects.get().paga_con)