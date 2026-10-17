from rest_framework import viewsets, permissions
from .models import Restaurante
from .serializers import RestauranteSerializer
from core.permissions import EsDueno


class RestauranteViewSet(viewsets.ModelViewSet):
    queryset = Restaurante.objects.all()
    serializer_class = RestauranteSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [EsDueno()]