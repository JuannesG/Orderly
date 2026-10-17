from rest_framework.exceptions import APIException


class PedidoCerrado(APIException):
    status_code = 409
    default_detail = 'Este pedido ya fue entregado y no se puede modificar.'
    default_code = 'pedido_cerrado'