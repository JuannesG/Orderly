from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


class TokenConRolSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        datos = super().validate(attrs)
        usuario = self.user
        datos['rol'] = 'dueño' if usuario.is_superuser else usuario.rol
        datos['nombre'] = usuario.get_full_name() or usuario.username
        return datos


class TokenConRolView(TokenObtainPairView):
    serializer_class = TokenConRolSerializer