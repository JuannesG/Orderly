from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import ping
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from menu.views import CategoriaViewSet, ProductoViewSet, AdicionViewSet
from clientes.views import ClienteViewSet
from pedidos.views import PedidoViewSet
from pagos.views import PagoViewSet
from restaurantes.views import RestauranteViewSet
from reservas.views import ReservaViewSet
from core.views import ping, dashboard_resumen
from django.conf import settings
from django.conf.urls.static import static

router = DefaultRouter()
router.register(r'categorias', CategoriaViewSet)
router.register(r'productos', ProductoViewSet)
router.register(r'clientes', ClienteViewSet)
router.register(r'pedidos', PedidoViewSet)
router.register(r'pagos', PagoViewSet)
router.register(r'adiciones', AdicionViewSet)
router.register(r'restaurantes', RestauranteViewSet)
router.register(r'reservas', ReservaViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/ping/', ping),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
        path('api/dashboard/resumen/', dashboard_resumen),
    path('api/', include(router.urls)),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)