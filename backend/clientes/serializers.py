from rest_framework import serializers
from .models import Cliente


class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = ['id', 'telefono', 'nombre', 'direccion', 'referencia', 'latitud', 'longitud']
        extra_kwargs = {
            'latitud': {
                'write_only': True, 'required': False, 'allow_null': True,
                'min_value': -90, 'max_value': 90,
            },
            'longitud': {
                'write_only': True, 'required': False, 'allow_null': True,
                'min_value': -180, 'max_value': 180,
            },
        }