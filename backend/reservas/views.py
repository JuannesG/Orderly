from rest_framework import viewsets, permissions
from .models import Reserva
from .serializers import ReservaSerializer
from core.permissions import EsDueno


class ReservaViewSet(viewsets.ModelViewSet):
    queryset = Reserva.objects.all()
    serializer_class = ReservaSerializer
    permission_classes = [EsDueno]