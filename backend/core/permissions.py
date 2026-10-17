from rest_framework.permissions import BasePermission


class EsPersonalDelPanel(BasePermission):
    """Solo dueño, domicilio o superusuario (el panel y la cocina)."""

    def has_permission(self, request, view):
        usuario = request.user
        return bool(
            usuario
            and usuario.is_authenticated
            and (usuario.is_superuser or usuario.rol in ('dueño', 'domicilios'))
        )


class EsMesera(BasePermission):
    """Solo meseras: tomar pedidos del local."""

    def has_permission(self, request, view):
        usuario = request.user
        return bool(
            usuario
            and usuario.is_authenticated
            and usuario.rol == 'mesera'
        )

class EsDueno(BasePermission):
    """Solo el dueño (o el superusuario): menú, reservas, dashboard y ajustes."""

    def has_permission(self, request, view):
        usuario = request.user
        return bool(
            usuario
            and usuario.is_authenticated
            and (usuario.is_superuser or usuario.rol == 'dueño')
        )    

class EsDuenoOMesera(BasePermission):
    """Dueño (o superusuario) y mesera: pedidos del local."""

    def has_permission(self, request, view):
        usuario = request.user
        return bool(
            usuario
            and usuario.is_authenticated
            and (usuario.is_superuser or usuario.rol in ('dueño', 'mesera'))
        )    