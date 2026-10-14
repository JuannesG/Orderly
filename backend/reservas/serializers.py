from rest_framework import serializers
from .models import Reserva


class ReservaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reserva
        fields = ['id', 'restaurante', 'nombre_cliente', 'telefono', 'fecha', 'hora', 'numero_personas', 'motivo', 'creado_en']