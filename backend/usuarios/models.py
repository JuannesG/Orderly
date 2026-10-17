from django.db import models
from django.contrib.auth.models import AbstractUser
from restaurantes.models import Restaurante

class Usuario(AbstractUser):
    ROLES=[
        ('dueño', 'Dueño'),
        ('domicilios', 'Domicilios'),
        ('mesera', 'Mesera'),
    ]
    restaurante = models.ForeignKey(Restaurante, on_delete=models.CASCADE, related_name='usuarios', null=True, blank=True)
    rol = models.CharField(max_length=20, choices=ROLES)

    def __str__(self):
        return f"{self.username} ({self.rol})"

