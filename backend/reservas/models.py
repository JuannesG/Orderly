from django.db import models
import uuid
from restaurantes.models import Restaurante


class Reserva(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    restaurante = models.ForeignKey(Restaurante, on_delete=models.CASCADE, related_name='reservas')
    nombre_cliente = models.CharField(max_length=150)
    telefono = models.CharField(max_length=20)
    fecha = models.DateField()
    hora = models.TimeField()
    numero_personas = models.PositiveIntegerField()
    motivo = models.CharField(max_length=255, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['fecha', 'hora']

    def __str__(self):
        return f"{self.nombre_cliente} - {self.fecha} {self.hora}"