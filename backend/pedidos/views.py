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
from .serializers import PedidoCreateSerializer, PedidoDetailSerializer, PedidoListSerializer, PedidoLocalCreateSerializer, PedidoLocalListSerializer
from core.permissions import EsPersonalDelPanel, EsDueno, EsDuenoOMesero
from core.exceptions import PedidoCerrado
from rest_framework.exceptions import PermissionDenied

logger = logging.getLogger(__name__)

EXTENSIONES_PERMITIDAS = {'.jpg', '.jpeg', '.png', '.webp', '.heic'}


class PedidoViewSet(viewsets.ModelViewSet):
    queryset = Pedido.objects.all().order_by('-creado_en')
    lookup_field = 'token_seguimiento'

    def get_serializer_class(self):
        if self.action == 'crear_local':
            return PedidoLocalCreateSerializer
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
        if self.action in ['crear_local', 'en_local']:
            return [EsDuenoOMesero()]
        if self.action in ['imprimir', 'entregado']:
            return [permissions.IsAuthenticated()]
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

    @action(detail=False, methods=['post'], url_path='local')
    def crear_local(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=201)

    def _validar_rol_para(self, pedido):
        usuario = self.request.user
        rol = 'dueño' if usuario.is_superuser else usuario.rol
        if pedido.tipo == 'local':
            permitidos = ('dueño', 'mesero')
        else:
            permitidos = ('dueño', 'domicilios')
        if rol not in permitidos:
            raise PermissionDenied()

    def _serializar(self, pedido):
        clase = PedidoLocalListSerializer if pedido.tipo == 'local' else PedidoListSerializer
        return clase(pedido, context=self.get_serializer_context()).data

    @action(detail=False, methods=['get'], url_path='en-local')
    def en_local(self, request):
        pedidos = (
            Pedido.objects.filter(tipo='local')
            .select_related('mesero')
            .prefetch_related('detalles__producto__categoria', 'detalles__adiciones')
            .order_by('-creado_en')
        )
        filtro = request.query_params.get('filtro', 'activos')
        if filtro == 'activos':
            pedidos = pedidos.exclude(estado='entregado').order_by('creado_en')
        elif filtro == 'hoy':
            pedidos = pedidos.filter(creado_en__date=timezone.localdate())
        elif filtro != 'todos':
            return Response({'detail': 'Filtro no válido.'}, status=400)

        if request.query_params.get('mios') == '1':
            pedidos = pedidos.filter(mesero=request.user)

        return Response(PedidoLocalListSerializer(pedidos[:200], many=True).data)

    @action(detail=True, methods=['post'])
    def imprimir(self, request, token_seguimiento=None):
        pedido = self.get_object()
        self._validar_rol_para(pedido)
        if pedido.estado == 'aceptado':
            pedido.estado = 'en_preparacion'
            pedido.save(update_fields=['estado'])
        return Response(self._serializar(pedido))

    @action(detail=True, methods=['post'])
    def entregado(self, request, token_seguimiento=None):
        pedido = self.get_object()
        self._validar_rol_para(pedido)
        if pedido.tipo != 'local':
            return Response(
                {'detail': 'Los domicilios se marcan desde el seguimiento del panel.'},
                status=400,
            )
        if pedido.estado != 'entregado':
            pedido.estado = 'entregado'
            pedido.save(update_fields=['estado'])
        return Response(self._serializar(pedido))

    def perform_update(self, serializer):
        if serializer.instance.estado == 'entregado':
            raise PedidoCerrado()
        serializer.save()

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