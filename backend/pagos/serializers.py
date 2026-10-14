from rest_framework import serializers
from .models import Pago


class PagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pago
        fields = ['id', 'pedido', 'metodo', 'estado_verificacion', 'comprobante_url', 'verificado_por']
        read_only_fields = ['id', 'pedido', 'metodo', 'comprobante_url']