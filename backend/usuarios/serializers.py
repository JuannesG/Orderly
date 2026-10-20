from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from .models import Usuario


def errores_de_clave(clave, usuario):
    """Pasa la clave por los validadores de settings.py y devuelve los mensajes de error."""
    try:
        validate_password(clave, usuario)
    except DjangoValidationError as error:
        return list(error.messages)
    return []


class UsuarioListSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.SerializerMethodField()
    es_yo = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = [
            'id', 'username', 'first_name', 'last_name', 'nombre_completo',
            'rol', 'is_active', 'last_login', 'es_yo',
        ]

    def get_nombre_completo(self, usuario):
        return usuario.get_full_name() or usuario.username

    def get_es_yo(self, usuario):
        request = self.context.get('request')
        return bool(request and request.user.pk == usuario.pk)


class UsuarioCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)

    class Meta:
        model = Usuario
        fields = ['id', 'username', 'first_name', 'last_name', 'rol', 'password']
        read_only_fields = ['id']

    def validate(self, datos):
        usuario_temporal = Usuario(
            username=datos.get('username', ''),
            first_name=datos.get('first_name', ''),
            last_name=datos.get('last_name', ''),
        )
        errores = errores_de_clave(datos['password'], usuario_temporal)
        if errores:
            raise serializers.ValidationError({'password': errores})
        return datos

    def create(self, datos):
        clave = datos.pop('password')
        usuario = Usuario(**datos, restaurante=self.context['restaurante'])
        usuario.set_password(clave)
        usuario.save()
        return usuario


class UsuarioUpdateSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)

    class Meta:
        model = Usuario
        fields = ['first_name', 'last_name', 'rol']

    def validate_rol(self, valor):
        quien_edita = self.context['request'].user
        if self.instance and self.instance.pk == quien_edita.pk and valor != self.instance.rol:
            raise serializers.ValidationError('No puedes cambiar tu propio rol.')
        return valor


class ClaveSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_password(self, valor):
        errores = errores_de_clave(valor, self.context['usuario'])
        if errores:
            raise serializers.ValidationError(errores)
        return valor