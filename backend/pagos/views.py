from rest_framework import viewsets, permissions
from .models import Pago
from .serializers import PagoSerializer
from core.permissions import EsPersonalDelPanel


class PagoViewSet(viewsets.ModelViewSet):
    queryset = Pago.objects.all()
    serializer_class = PagoSerializer
    permission_classes = [EsPersonalDelPanel]