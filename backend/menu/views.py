from django.db.models import ProtectedError
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Categoria, Producto, Adicion
from .serializers import CategoriaSerializer, ProductoSerializer, AdicionSerializer


class LecturaPublicaMixin:
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]


class CategoriaViewSet(LecturaPublicaMixin, viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'detail': 'No se puede eliminar: tiene productos que ya aparecen en pedidos.'},
                status=status.HTTP_409_CONFLICT
            )


class ProductoViewSet(LecturaPublicaMixin, viewsets.ModelViewSet):
    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'detail': 'Este producto ya aparece en pedidos anteriores, no se puede eliminar.'},
                status=status.HTTP_409_CONFLICT
            )


class AdicionViewSet(LecturaPublicaMixin, viewsets.ModelViewSet):
    queryset = Adicion.objects.all()
    serializer_class = AdicionSerializer