from django.contrib.auth import get_user_model
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


def rol_de(usuario):
    return 'dueño' if usuario.is_superuser else usuario.rol


def datos_de_sesion(usuario):
    """Tokens nuevos y datos de sesión (los usa el cambio de contraseña propio)."""
    refresco = RefreshToken.for_user(usuario)
    refresco['sah'] = usuario.get_session_auth_hash()
    return {
        'access': str(refresco.access_token),
        'refresh': str(refresco),
        'rol': rol_de(usuario),
        'nombre': usuario.get_full_name() or usuario.username,
        'debe_cambiar_clave': usuario.debe_cambiar_clave,
    }


class TokenConRolSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, usuario):
        token = super().get_token(usuario)
        token['sah'] = usuario.get_session_auth_hash()
        return token

    def validate(self, attrs):
        datos = super().validate(attrs)
        usuario = self.user
        datos['rol'] = rol_de(usuario)
        datos['nombre'] = usuario.get_full_name() or usuario.username
        datos['debe_cambiar_clave'] = usuario.debe_cambiar_clave
        return datos


class TokenConRolView(TokenObtainPairView):
    serializer_class = TokenConRolSerializer


class RefrescoConSesionSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        refresco = RefreshToken(attrs['refresh'])
        usuario = get_user_model().objects.filter(
            pk=refresco.get(api_settings.USER_ID_CLAIM)
        ).first()
        if (
            usuario is None
            or not usuario.is_active
            or refresco.get('sah') != usuario.get_session_auth_hash()
        ):
            raise InvalidToken('La sesión ya no es válida.')
        return super().validate(attrs)


class RefrescoConSesionView(TokenRefreshView):
    serializer_class = RefrescoConSesionSerializer