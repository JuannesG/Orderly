from datetime import date
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.db.models.functions import Coalesce, ExtractHour
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from core.permissions import EsDueno
from menu.models import Producto
from pedidos.models import Pedido
from restaurantes.models import Restaurante

MAX_DIAS = 366
TOP = 5


def leer_fecha(texto):
    try:
        return date.fromisoformat(texto)
    except (TypeError, ValueError):
        return None


def leer_rango(request):
    """Devuelve (desde, hasta, error). Si hay error, es una Response lista para devolver."""
    hoy = timezone.localdate()
    params = request.query_params
    desde = leer_fecha(params.get('desde')) if 'desde' in params else hoy
    hasta = leer_fecha(params.get('hasta')) if 'hasta' in params else hoy

    if desde is None or hasta is None:
        return None, None, Response({'detail': 'Fechas inválidas. Usa el formato AAAA-MM-DD.'}, status=400)
    if desde > hasta:
        return None, None, Response({'detail': 'La fecha inicial no puede ser mayor que la final.'}, status=400)
    if (hasta - desde).days > MAX_DIAS:
        return None, None, Response({'detail': 'El rango máximo es de un año.'}, status=400)
    return desde, hasta, None


def pedidos_entregados(restaurante, desde, hasta):
    return Pedido.objects.filter(
        restaurante=restaurante,
        estado='entregado',
        creado_en__date__gte=desde,
        creado_en__date__lte=hasta,
    )


@api_view(['GET'])
@permission_classes([EsDueno])
def estadisticas_resumen(request):
    restaurante = Restaurante.objects.first()
    if not restaurante:
        return Response({'detail': 'No hay restaurante configurado.'}, status=404)

    desde, hasta, error = leer_rango(request)
    if error:
        return error

    entregados = pedidos_entregados(restaurante, desde, hasta)

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


@api_view(['GET'])
@permission_classes([EsDueno])
def estadisticas_detalle(request):
    restaurante = Restaurante.objects.first()
    if not restaurante:
        return Response({'detail': 'No hay restaurante configurado.'}, status=404)

    desde, hasta, error = leer_rango(request)
    if error:
        return error

    entregados = pedidos_entregados(restaurante, desde, hasta)

    # Se parte de TODOS los productos para que los que no se vendieron salgan con 0
    productos = list(
        Producto.objects.filter(categoria__restaurante=restaurante)
        .annotate(unidades=Coalesce(
            Sum('detallepedido__cantidad', filter=Q(detallepedido__pedido__in=entregados)), 0
        ))
        .values('nombre', 'unidades')
    )
    mas_vendidos = sorted(
        (p for p in productos if p['unidades'] > 0),
        key=lambda p: (-p['unidades'], p['nombre'])
    )[:TOP]
    menos_vendidos = sorted(productos, key=lambda p: (p['unidades'], p['nombre']))[:TOP]

    # Pedidos entregados por hora de creación (hora de Bogotá)
    por_hora = {
        fila['hora']: fila['pedidos']
        for fila in entregados.annotate(hora=ExtractHour('creado_en'))
        .values('hora').annotate(pedidos=Count('id'))
    }
    horas = [{'hora': h, 'pedidos': por_hora.get(h, 0)} for h in range(24)]

    return Response({
        'desde': desde.isoformat(),
        'hasta': hasta.isoformat(),
        'mas_vendidos': mas_vendidos,
        'menos_vendidos': menos_vendidos,
        'horas': horas,
    })