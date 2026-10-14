from rest_framework import serializers
from .models import Categoria, Producto
from .models import Categoria, Producto, Adicion
from restaurantes.models import Restaurante


class ProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = ['id', 'categoria', 'nombre', 'descripcion', 'precio', 'disponible', 'imagen_url']

class CategoriaSerializer(serializers.ModelSerializer):
    productos = ProductoSerializer(many=True, read_only=True)

    class Meta:
        model = Categoria
        fields = ['id', 'restaurante', 'nombre', 'productos']
        extra_kwargs = {'restaurante': {'required': False}}

    def create(self, validated_data):
        if not validated_data.get('restaurante'):
            validated_data['restaurante'] = Restaurante.objects.first()
        return super().create(validated_data)

class AdicionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Adicion
        fields = ['id', 'restaurante', 'nombre', 'precio']        