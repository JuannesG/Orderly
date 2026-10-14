from django.db import models
import uuid
from pedidos.models import Pedido
from usuarios.models import Usuario

class Pago(models.Model):
    METODOS = [
        ('nequi', 'Nequi'),
        ('bancolombia', 'Bancolombia'),
        ('efectivo', 'Efectivo contraentrega'),
    ]

    ESTADOS_VERIFICACION = [
        ('pendiente_verificacion', 'Pendiente de verificación'),
        ('aceptado', 'Aceptado'),
        ('rechazado', 'Rechazado'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pedido = models.OneToOneField(Pedido, on_delete=models.CASCADE, related_name='pago')
    metodo = models.CharField(max_length=20, choices=METODOS)
    estado_verificacion = models.CharField(max_length=30, choices=ESTADOS_VERIFICACION, default='pendiente_verificacion')
    comprobante = models.FileField(upload_to='comprobantes/', blank=True, null=True)
    comprobante_url = models.URLField(blank=True, null=True)
    verificado_por = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True)
    verificado_en = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Pago de {self.pedido_id} - {self.estado_verificacion}"

