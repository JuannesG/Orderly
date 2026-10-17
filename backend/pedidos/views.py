import logging
import os
from datetime import timedelta

import cloudinary.uploader
from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from .models import Pedido
from core.permissions import EsPersonalDelPanel, EsDueno
from .serializers import PedidoCreateSerializer, PedidoDetailSerializer, PedidoListSerializer

logger = logging.getLogger(__name__)

EXTENSIONES_PERMITIDAS = {'.jpg', '.jpeg', '.png', '.webp', '.heic'}


class PedidoViewSet(viewsets.ModelViewSet):
    queryset = Pedido.objects.all().order_by('-creado_en')
    lookup_field = 'token_seguimiento'

    def get_serializer_class(self):
        if self.action == 'create':
            return PedidoCreateSerializer
        if self.action == 'list':
            return PedidoListSerializer
        return PedidoDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        usuario = self.request.user
        if usuario.is_authenticated and not usuario.is_superuser and usuario.rol == 'domicilios':
            queryset = queryset.filter(tipo='domicilio')
        return queryset

    def get_permissions(self):
        if self.action in ['create', 'retrieve', 'mios', 'comprobante']:
            return [permissions.AllowAny()]
        if self.action == 'destroy':
            return [EsDueno()]
        return [EsPersonalDelPanel()]

    def get_throttles(self):
        if self.action == 'create':
            self.throttle_scope = 'crear_pedido'
            return [ScopedRateThrottle()]
        return super().get_throttles()

    @action(detail=False, methods=['get'])
    def mios(self, request):
        telefono = request.query_params.get('telefono')
        if not telefono:
            return Response([])

        desde = timezone.now() - timedelta(days=30)
        pedidos = Pedido.objects.filter(
            cliente__telefono=telefono,
            creado_en__gte=desde
        ).order_by('-creado_en')

        return Response(PedidoDetailSerializer(pedidos, many=True).data)

    @action(detail=True, methods=['post'], url_path='comprobante',
            parser_classes=[MultiPartParser, FormParser])
    def comprobante(self, request, token_seguimiento=None):
        pedido = self.get_object()
        archivo = request.FILES.get('comprobante')

        if not archivo:
            return Response({'detail': 'Falta el archivo.'}, status=400)

        extension = os.path.splitext(archivo.name)[1].lower()
        if extension not in EXTENSIONES_PERMITIDAS or not archivo.content_type.startswith('image/'):
            return Response({'detail': 'Solo se permiten imágenes (jpg, png, webp).'}, status=400)
        if archivo.size > 5 * 1024 * 1024:
            return Response({'detail': 'La imagen supera 5 MB.'}, status=400)

        pago = pedido.pago
        if pago.metodo == 'efectivo':
            return Response({'detail': 'Este pedido es en efectivo.'}, status=400)
        if pago.estado_verificacion == 'aceptado':
            return Response({'detail': 'El pago ya fue confirmado.'}, status=400)

        if settings.USAR_CLOUDINARY:
            # El nombre en Cloudinary es comprobantes/<id del pago>; así el
            # comando de limpieza sabe qué borrar sin guardar nada más.
            try:
                archivo.seek(0)
                resultado = cloudinary.uploader.upload(
                    archivo.read(),
                    folder='comprobantes',
                    public_id=str(pago.id),
                    overwrite=True,
                    resource_type='image',
                    format='jpg',
                )
            except Exception:
                logger.exception('Error al subir el comprobante a Cloudinary')
                return Response(
                    {'detail': 'No se pudo guardar el comprobante. Intenta de nuevo.'},
                    status=502,
                )
            pago.comprobante_url = resultado['secure_url']
        else:
            pago.comprobante = archivo

        pago.estado_verificacion = 'pendiente_verificacion'
        pago.save()
        return Response({'ok': True})