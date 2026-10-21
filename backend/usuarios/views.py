from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import EsDueno
from core.tokens import datos_de_sesion
from restaurantes.models import Restaurante
from .models import Usuario
from .serializers import (
    CambioClavePropioSerializer,
    ClaveSerializer,
    UsuarioCreateSerializer,
    UsuarioListSerializer,
    UsuarioUpdateSerializer,
)


class UsuarioConHistorial(APIException):
    status_code = 409
    default_detail = 'Este usuario ya tiene pedidos registrados y no se puede eliminar. Desactívalo.'
    default_code = 'usuario_con_historial'


class UsuarioViewSet(viewsets.ModelViewSet):
    permission_classes = [EsDueno]
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def restaurante_del_dueno(self):
        usuario = self.request.user
        return usuario.restaurante or Restaurante.objects.first()

    def get_queryset(self):
        restaurante = self.restaurante_del_dueno()
        if restaurante is None:
            return Usuario.objects.none()
        return (
            Usuario.objects
            .filter(restaurante=restaurante, is_superuser=False)
            .order_by('-is_active', 'first_name', 'username')
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return UsuarioCreateSerializer
        if self.action == 'partial_update':
            return UsuarioUpdateSerializer
        return UsuarioListSerializer

    def get_serializer_context(self):
        contexto = super().get_serializer_context()
        contexto['restaurante'] = self.restaurante_del_dueno()
        return contexto

    def datos_usuario(self, usuario):
        return UsuarioListSerializer(usuario, context={'request': self.request}).data

    def create(self, request, *args, **kwargs):
        if self.restaurante_del_dueno() is None:
            raise ValidationError({'detail': 'No hay restaurante configurado.'})
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = serializer.save()
        return Response(self.datos_usuario(usuario), status=201)

    def partial_update(self, request, *args, **kwargs):
        usuario = self.get_object()
        serializer = self.get_serializer(usuario, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(self.datos_usuario(usuario))

    def destroy(self, request, *args, **kwargs):
        usuario = self.get_object()
        if usuario.pk == request.user.pk:
            raise ValidationError({'detail': 'No puedes eliminar tu propia cuenta.'})
        if usuario.pedidos_tomados.exists() or usuario.historialestado_set.exists():
            raise UsuarioConHistorial()
        usuario.delete()
        return Response(status=204)

    @action(detail=True, methods=['post'])
    def desactivar(self, request, pk=None):
        usuario = self.get_object()
        if usuario.pk == request.user.pk:
            raise ValidationError({'detail': 'No puedes desactivar tu propia cuenta.'})
        usuario.is_active = False
        usuario.save(update_fields=['is_active'])
        return Response(self.datos_usuario(usuario))

    @action(detail=True, methods=['post'])
    def reactivar(self, request, pk=None):
        usuario = self.get_object()
        usuario.is_active = True
        usuario.save(update_fields=['is_active'])
        return Response(self.datos_usuario(usuario))

    @action(detail=True, methods=['post'])
    def clave(self, request, pk=None):
        usuario = self.get_object()
        serializer = ClaveSerializer(data=request.data, context={'usuario': usuario})
        serializer.is_valid(raise_exception=True)
        usuario.set_password(serializer.validated_data['password'])
        usuario.debe_cambiar_clave = usuario.pk != request.user.pk
        usuario.save(update_fields=['password', 'debe_cambiar_clave'])
        return Response({'detail': 'Contraseña actualizada.'})

class CambiarClavePropiaView(APIView):
    """Cada persona cambia su propia contraseña. Es también la única ruta que puede usar
    quien todavía debe crear la suya (ver core/authentication.py)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        usuario = request.user
        serializer = CambioClavePropioSerializer(
            data=request.data, context={'usuario': usuario}
        )
        serializer.is_valid(raise_exception=True)
        usuario.set_password(serializer.validated_data['clave_nueva'])
        usuario.debe_cambiar_clave = False
        usuario.save(update_fields=['password', 'debe_cambiar_clave'])
        return Response(datos_de_sesion(usuario))    