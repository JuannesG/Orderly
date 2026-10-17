from rest_framework import viewsets, permissions
from .models import Pago
from .serializers import PagoSerializer
from core.permissions import EsPersonalDelPanel
from core.exceptions import PedidoCerrado

class PagoViewSet(viewsets.ModelViewSet):
    queryset = Pago.objects.all()
    serializer_class = PagoSerializer
    permission_classes = [EsPersonalDelPanel]

    def perform_update(self, serializer):
        if serializer.instance.pedido.estado == 'entregado':
            raise PedidoCerrado()
        serializer.save()