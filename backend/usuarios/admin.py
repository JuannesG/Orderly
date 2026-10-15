from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    # Agrega los campos propios de Orderly a la ficha de edición...
    fieldsets = UserAdmin.fieldsets + (
        ('Restaurante', {'fields': ('restaurante', 'rol')}),
    )
    # ...y al formulario de crear un usuario nuevo.
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Restaurante', {'fields': ('restaurante', 'rol')}),
    )
    list_display = ('username', 'restaurante', 'rol', 'is_staff')