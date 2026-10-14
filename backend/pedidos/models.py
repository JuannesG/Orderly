from django.db import models
import uuid
from restaurantes.models import Restaurante
from clientes.models import Cliente
from menu.models import Producto
from usuarios.models import Usuario

class Pedido(models.Model):
    ESTADOS = [
        ('pendiente_verificacion', 'Pendiente de verificación'),
        ('aceptado', 'Aceptado'),
        ('rechazado', 'Rechazado'),
        ('en_preparacion', 'En preparación'),
        ('en_camino', 'En camino'),
        ('entregado', 'Entregado'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    token_seguimiento = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name='pedidos')
    restaurante = models.ForeignKey(Restaurante, on_delete=models.PROTECT, related_name='pedidos')
    estado = models.CharField(max_length=30, choices=ESTADOS, default='pendiente_verificacion')
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    costo_domicilio = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    observaciones = models.TextField(blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Pedido {self.id} - {self.cliente.nombre}"

class DetallePedido(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name='detalles')
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT)
    cantidad = models.PositiveIntegerField()
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    adiciones = models.ManyToManyField('menu.Adicion', blank=True, related_name='detalles_pedido')

    def __str__(self):
        return f"{self.cantidad} x {self.producto.nombre}"

class HistorialEstado(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name='historial')
    usuario = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True)
    estado = models.CharField(max_length=30, choices=Pedido.ESTADOS)
    fecha = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Historial de {self.pedido_id} -> {self.estado}  ({self.fecha})"
