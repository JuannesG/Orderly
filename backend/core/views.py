from datetime import date, timedelta
from django.db.models import Sum, Count
from django.db.models.functions import TruncDate
from rest_framework.decorators import api_view, permission_classes
from core.permissions import EsDueno
from rest_framework.response import Response
from restaurantes.models import Restaurante
from pedidos.models import Pedido
from reservas.models import Reserva
from django.utils import timezone

@api_view(['GET'])
@permission_classes([EsDueno])

def dashboard_resumen(request):
    restaurante = Restaurante.objects.first()
    if not restaurante:
        return Response({'detail': 'No hay restaurante configurado.'}, status=404)

    hoy = timezone.localdate()
    ayer = hoy - timedelta(days=1)

    pedidos_hoy_qs = Pedido.objects.filter(restaurante=restaurante, creado_en__date=hoy)
    pedidos_ayer_qs = Pedido.objects.filter(restaurante=restaurante, creado_en__date=ayer)

    pedidos_hoy = pedidos_hoy_qs.count()
    pedidos_ayer = pedidos_ayer_qs.count()

    ingresos_hoy = pedidos_hoy_qs.exclude(estado='rechazado').aggregate(total=Sum('total'))['total'] or 0
    ingresos_ayer = pedidos_ayer_qs.exclude(estado='rechazado').aggregate(total=Sum('total'))['total'] or 0

    por_estado = {
        estado: pedidos_hoy_qs.filter(estado=estado).count()
        for estado in ['pendiente_verificacion', 'aceptado', 'en_preparacion', 'en_camino', 'entregado', 'rechazado']
    }

    reservas_hoy = Reserva.objects.filter(restaurante=restaurante, fecha=hoy).count()
    reservas_ayer = Reserva.objects.filter(restaurante=restaurante, fecha=ayer).count()

    pedidos_recientes = pedidos_hoy_qs.order_by('-creado_en')[:5]
    recientes_data = [
        {
            'id': str(p.id),
            'cliente_nombre': p.cliente.nombre if p.cliente else 'En el local',
            'total': p.total,
            'estado': p.estado,
            'creado_en': p.creado_en,
        }
        for p in pedidos_recientes
    ]

    hace_7_dias = hoy - timedelta(days=6)
    por_dia_qs = (
        Pedido.objects.filter(restaurante=restaurante, creado_en__date__gte=hace_7_dias)
        .annotate(dia=TruncDate('creado_en'))
        .values('dia')
        .annotate(cantidad=Count('id'))
        .order_by('dia')
    )
    por_dia_dict = {item['dia'].isoformat(): item['cantidad'] for item in por_dia_qs}
    grafica_semana = []
    for i in range(7):
        dia = hace_7_dias + timedelta(days=i)
        grafica_semana.append({
            'fecha': dia.isoformat(),
            'cantidad': por_dia_dict.get(dia.isoformat(), 0)
        })

    return Response({
        'pedidos_hoy': pedidos_hoy,
        'pedidos_ayer': pedidos_ayer,
        'ingresos_hoy': ingresos_hoy,
        'ingresos_ayer': ingresos_ayer,
        'por_estado': por_estado,
        'reservas_hoy': reservas_hoy,
        'reservas_ayer': reservas_ayer,
        'pedidos_recientes': recientes_data,
        'grafica_semana': grafica_semana,
        'restaurante_abierto': restaurante.abierto,
    })

def ping(request):
    return Response({"message": "Django está vivo"})