from datetime import datetime
from decimal import Decimal
from unittest.mock import patch
from zoneinfo import ZoneInfo

from core.testing import BaseAPITestCase
from pedidos.models import Pedido

URL = '/api/dashboard/resumen/'


class DashboardHoyTests(BaseAPITestCase):
    def test_hoy_usa_la_hora_de_bogota(self):
        # 10 de marzo, 11:30 p. m. en Bogotá = 11 de marzo, 4:30 a. m. en UTC
        instante = datetime(2026, 3, 10, 23, 30, tzinfo=ZoneInfo('America/Bogota'))

        pedido = Pedido.objects.create(
            restaurante=self.restaurante,
            subtotal=Decimal('10000'), total=Decimal('10000'),
        )
        Pedido.objects.filter(pk=pedido.pk).update(creado_en=instante)

        self.entrar_como_dueno()
        with patch('django.utils.timezone.now', return_value=instante):
            datos = self.client.get(URL).data

        self.assertEqual(datos['pedidos_hoy'], 1)
        self.assertEqual(datos['pedidos_ayer'], 0)