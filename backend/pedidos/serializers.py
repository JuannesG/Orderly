from decimal import Decimal
from django.db import transaction
from rest_framework import serializers
from menu.models import Adicion
from pagos.models import Pago
from .models import Pedido, DetallePedido

COSTO_DOMICILIO = Decimal('3000')


class DetallePedidoSerializer(serializers.ModelSerializer):
    cantidad = serializers.IntegerField(min_value=1, max_value=50)
    adiciones = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Adicion.objects.all(), required=False
    )

    class Meta:
        model = DetallePedido
        fields = ['producto', 'cantidad', 'adiciones']


class AdicionDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Adicion
        fields = ['id', 'nombre', 'precio']


class DetallePedidoDetailSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    categoria_nombre = serializers.CharField(source='producto.categoria.nombre', read_only=True)
    adiciones = AdicionDetailSerializer(many=True, read_only=True)

    class Meta:
        model = DetallePedido
        fields = ['producto_nombre', 'categoria_nombre', 'cantidad', 'precio_unitario', 'adiciones']


class PedidoCreateSerializer(serializers.ModelSerializer):
    detalles = DetallePedidoSerializer(many=True)
    metodo_pago = serializers.ChoiceField(choices=Pago.METODOS, write_only=True)

    class Meta:
        model = Pedido
        fields = [
            'id', 'cliente', 'restaurante', 'subtotal', 'costo_domicilio', 'total',
            'observaciones', 'detalles', 'metodo_pago', 'token_seguimiento', 'estado'
        ]
        read_only_fields = [
            'id', 'subtotal', 'costo_domicilio', 'total', 'token_seguimiento', 'estado'
        ]

    def validate_observaciones(self, value):
        if len(value) > 300:
            raise serializers.ValidationError('Las observaciones son muy largas (máximo 300 caracteres).')
        return value

    def validate(self, data):
        restaurante = data['restaurante']

        if not restaurante.abierto:
            raise serializers.ValidationError('El restaurante está cerrado en este momento.')
        if not data.get('detalles'):
            raise serializers.ValidationError('El pedido no tiene productos.')

        for detalle in data['detalles']:
            producto = detalle['producto']
            if producto.categoria.restaurante_id != restaurante.id:
                raise serializers.ValidationError('Hay un producto que no pertenece a este restaurante.')
            if not producto.disponible:
                raise serializers.ValidationError(f'"{producto.nombre}" no está disponible.')
            for adicion in detalle.get('adiciones', []):
                if adicion.restaurante_id != restaurante.id:
                    raise serializers.ValidationError('Hay un adicional que no pertenece a este restaurante.')

        return data

    @transaction.atomic
    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles')
        metodo_pago = validated_data.pop('metodo_pago')

        subtotal = Decimal('0')
        lineas = []
        for detalle in detalles_data:
            producto = detalle['producto']
            adiciones = detalle.get('adiciones', [])
            extra = sum((a.precio for a in adiciones), Decimal('0'))
            subtotal += (producto.precio + extra) * detalle['cantidad']
            lineas.append((producto, detalle['cantidad'], adiciones))

        pedido = Pedido.objects.create(
            **validated_data,
            subtotal=subtotal,
            costo_domicilio=COSTO_DOMICILIO,
            total=subtotal + COSTO_DOMICILIO,
        )

        for producto, cantidad, adiciones in lineas:
            detalle_obj = DetallePedido.objects.create(
                pedido=pedido,
                producto=producto,
                cantidad=cantidad,
                precio_unitario=producto.precio,
            )
            detalle_obj.adiciones.set(adiciones)

        estado_pago = 'aceptado' if metodo_pago == 'efectivo' else 'pendiente_verificacion'
        Pago.objects.create(pedido=pedido, metodo=metodo_pago, estado_verificacion=estado_pago)

        return pedido


class PedidoDetailSerializer(serializers.ModelSerializer):
    detalles = DetallePedidoDetailSerializer(many=True, read_only=True)
    restaurante_nombre = serializers.CharField(source='restaurante.nombre', read_only=True)
    restaurante_whatsapp = serializers.CharField(source='restaurante.whatsapp_numero', read_only=True)
    cliente_telefono = serializers.CharField(source='cliente.telefono', read_only=True)
    cliente_direccion = serializers.CharField(source='cliente.direccion', read_only=True)
    cliente_referencia = serializers.CharField(source='cliente.referencia', read_only=True)
    metodo_pago = serializers.CharField(source='pago.metodo', read_only=True)
    estado_pago = serializers.CharField(source='pago.estado_verificacion', read_only=True)

    class Meta:
        model = Pedido
        fields = [
            'id', 'token_seguimiento', 'estado', 'subtotal', 'costo_domicilio',
            'total', 'observaciones', 'detalles', 'creado_en',
            'restaurante_nombre', 'restaurante_whatsapp', 'cliente_telefono',
            'cliente_direccion', 'cliente_referencia', 'metodo_pago', 'estado_pago'
        ]


class PagoAnidadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pago
        fields = ['id', 'metodo', 'estado_verificacion', 'comprobante_url', 'comprobante']


class PedidoListSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente.nombre', read_only=True)
    cliente_telefono = serializers.CharField(source='cliente.telefono', read_only=True)
    cliente_direccion = serializers.CharField(source='cliente.direccion', read_only=True)
    cliente_referencia = serializers.CharField(source='cliente.referencia', read_only=True)
    detalles = DetallePedidoDetailSerializer(many=True, read_only=True)
    pago = PagoAnidadoSerializer(read_only=True)

    class Meta:
        model = Pedido
        fields = [
            'id', 'token_seguimiento', 'estado', 'cliente_nombre', 'cliente_telefono',
            'cliente_direccion', 'cliente_referencia', 'subtotal', 'costo_domicilio',
            'total', 'observaciones', 'detalles', 'pago', 'creado_en'
        ]