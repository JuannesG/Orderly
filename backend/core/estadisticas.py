from datetime import date
from decimal import Decimal

from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from core.permissions import EsDueno
from pedidos.models import Pedido
from restaurantes.models import Restaurante

MAX_DIAS = 366


def leer_fecha(texto):
    try:
        return date.fromisoformat(texto)
    except (TypeError, ValueError):
        return None


@api_view(['GET'])
@permission_classes([EsDueno])
def estadisticas_resumen(request):
    restaurante = Restaurante.objects.first()
    if not restaurante:
        return Response({'detail': 'No hay restaurante configurado.'}, status=404)

    hoy = timezone.localdate()
    desde = leer_fecha(request.query_params.get('desde')) if 'desde' in request.query_params else hoy
    hasta = leer_fecha(request.query_params.get('hasta')) if 'hasta' in request.query_params else hoy

    if desde is None or hasta is None:
        return Response({'detail': 'Fechas inválidas. Usa el formato AAAA-MM-DD.'}, status=400)
    if desde > hasta:
        return Response({'detail': 'La fecha inicial no puede ser mayor que la final.'}, status=400)
    if (hasta - desde).days > MAX_DIAS:
        return Response({'detail': 'El rango máximo es de un año.'}, status=400)

    entregados = Pedido.objects.filter(
        restaurante=restaurante,
        estado='entregado',
        creado_en__date__gte=desde,
        creado_en__date__lte=hasta,
    )

    totales = entregados.aggregate(ventas=Sum('total'), pedidos=Count('id'))
    ventas = totales['ventas'] or Decimal('0')
    pedidos = totales['pedidos']
    ticket = ventas / pedidos if pedidos else Decimal('0')

    por_tipo = {
        'domicilio': {'pedidos': 0, 'ventas': 0},
        'local': {'pedidos': 0, 'ventas': 0},
    }
    for fila in entregados.values('tipo').annotate(pedidos=Count('id'), ventas=Sum('total')):
        por_tipo[fila['tipo']] = {
            'pedidos': fila['pedidos'],
            'ventas': int(fila['ventas'] or 0),
        }

    return Response({
        'desde': desde.isoformat(),
        'hasta': hasta.isoformat(),
        'ventas_total': int(ventas),
        'pedidos_entregados': pedidos,
        'ticket_promedio': int(ticket),
        'por_tipo': por_tipo,
    })