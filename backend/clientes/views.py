from rest_framework import viewsets, permissions
from .models import Cliente
from .serializers import ClienteSerializer
from core.permissions import EsDueno

class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    def get_permissions(self):
        if self.action in ['list', 'destroy']:
            return [EsDueno()]
        return [permissions.AllowAny()]
    lookup_field = 'telefono'
    