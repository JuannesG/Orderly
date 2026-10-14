from django.db import models
import uuid

class Restaurante(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=150)
    direccion = models.CharField(max_length=255)
    latitud = models.FloatField()
    longitud = models.FloatField()
    whatsapp_numero = models.CharField(max_length=20)
    cuenta_nequi = models.CharField(max_length=50, blank=True)
    cuenta_bancolombia = models.CharField(max_length=50, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    abierto = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre

