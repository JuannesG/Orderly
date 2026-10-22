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

ETIQUETAS_METODO = {
    'nequi': 'Nequi',
    'bancolombia': 'Bancolombia',
    'efectivo': 'Efectivo contraentrega',
}


def nombre_usuario(nombre, apellido, usuario):
    completo = f"{nombre or ''} {apellido or ''}".strip()
    return completo or usuario


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

@api_view(['GET'])
@permission_classes([EsDueno])
def estadisticas_pagos_clientes(request):
    restaurante = Restaurante.objects.first()
    if not restaurante:
        return Response({'detail': 'No hay restaurante configurado.'}, status=404)

    desde, hasta, error = leer_rango(request)
    if error:
        return error

    entregados = pedidos_entregados(restaurante, desde, hasta)

    # Métodos de pago: solo domicilios (en el local se cobra en caja)
    filas_pago = list(
        entregados.filter(tipo='domicilio')
        .values('pago__metodo')
        .annotate(pedidos=Count('id'), ventas=Sum('total'))
        .order_by('-ventas')
    )
    total_domicilios = sum(int(f['ventas'] or 0) for f in filas_pago)
    metodos_pago = []
    for fila in filas_pago:
        clave = fila['pago__metodo']
        ventas = int(fila['ventas'] or 0)
        metodos_pago.append({
            'metodo': clave or 'sin_metodo',
            'nombre': ETIQUETAS_METODO.get(clave, 'Sin método'),
            'pedidos': fila['pedidos'],
            'ventas': ventas,
            'porcentaje': round(ventas * 100 / total_domicilios) if total_domicilios else 0,
        })

    # Rechazados: se miden contra TODOS los pedidos recibidos, no solo los entregados
    recibidos_qs = Pedido.objects.filter(
        restaurante=restaurante,
        creado_en__date__gte=desde,
        creado_en__date__lte=hasta,
    )
    recibidos = recibidos_qs.count()
    rechazados = recibidos_qs.filter(estado='rechazado').count()

    # Desempeño por mesera: pedidos del local entregados
    meseras = []
    filas_mesera = (
        entregados.filter(tipo='local')
        .values('mesera', 'mesera__first_name', 'mesera__last_name', 'mesera__username')
        .annotate(pedidos=Count('id'), ventas=Sum('total'))
        .order_by('-ventas')
    )
    for fila in filas_mesera:
        if fila['mesera'] is None:
            nombre = 'Sin asignar'
        else:
            nombre = nombre_usuario(
                fila['mesera__first_name'], fila['mesera__last_name'], fila['mesera__username']
            )
        meseras.append({
            'nombre': nombre,
            'pedidos': fila['pedidos'],
            'ventas': int(fila['ventas'] or 0),
        })

    # Clientes: quiénes pidieron, cuántos son nuevos y cuántos repiten
    por_cliente = list(
        entregados.exclude(cliente__isnull=True)
        .values('cliente', 'cliente__nombre', 'cliente__creado_en')
        .annotate(pedidos=Count('id'), ventas=Sum('total'))
    )
    nuevos = sum(
        1 for c in por_cliente
        if desde <= timezone.localtime(c['cliente__creado_en']).date() <= hasta
    )
    repiten = sum(1 for c in por_cliente if c['pedidos'] >= 2)
    top_clientes = sorted(
        por_cliente,
        key=lambda c: (-c['pedidos'], -(c['ventas'] or 0), c['cliente__nombre'])
    )[:TOP]

    return Response({
        'desde': desde.isoformat(),
        'hasta': hasta.isoformat(),
        'metodos_pago': metodos_pago,
        'rechazados': {
            'recibidos': recibidos,
            'rechazados': rechazados,
            'porcentaje': round(rechazados * 100 / recibidos) if recibidos else 0,
        },
        'meseras': meseras,
        'clientes': {
            'atendidos': len(por_cliente),
            'nuevos': nuevos,
            'repiten': repiten,
            'top': [
                {'nombre': c['cliente__nombre'], 'pedidos': c['pedidos'], 'ventas': int(c['ventas'] or 0)}
                for c in top_clientes
            ],
        },
    })