from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

# Única ruta que puede usar quien todavía debe crear su propia contraseña.
RUTA_CAMBIO_CLAVE = '/api/cuenta/clave/'


class SoftJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        usuario = super().get_user(validated_token)
        # Si la contraseña cambió después de emitir el token, la sesión ya no vale.
        if validated_token.get('sah') != usuario.get_session_auth_hash():
            raise InvalidToken('La sesión ya no es válida.')
        return usuario

    def authenticate(self, request):
        try:
            resultado = super().authenticate(request)
        except (InvalidToken, TokenError):
            return None

        if resultado is None:
            return None

        usuario, _token = resultado
        if usuario.debe_cambiar_clave and request.path != RUTA_CAMBIO_CLAVE:
            return None
        return resultado