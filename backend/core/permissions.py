from rest_framework.permissions import BasePermission


class EsPersonalDelPanel(BasePermission):
    """Solo dueño, empleado o superusuario (el panel y la cocina)."""

    def has_permission(self, request, view):
        usuario = request.user
        return bool(
            usuario
            and usuario.is_authenticated
            and (usuario.is_superuser or usuario.rol in ('dueño', 'empleado'))
        )


class EsMesero(BasePermission):
    """Solo meseros: tomar pedidos del local."""

    def has_permission(self, request, view):
        usuario = request.user
        return bool(
            usuario
            and usuario.is_authenticated
            and usuario.rol == 'mesero'
        )