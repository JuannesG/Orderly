import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Inicio } from './features/dashboard/inicio/inicio';
import { ListaProductos } from './features/menu/lista-productos/lista-productos';
import { ProductoForm } from './features/menu/producto-form/producto-form';
import { ListaPedidos } from './features/pedidos/lista-pedidos/lista-pedidos';
import { ListaReservas } from './features/reservas/lista-reservas/lista-reservas';
import { Registro } from './features/tienda/registro/registro';
import { Catalogo } from './features/tienda/catalogo/catalogo';
import { Carrito } from './features/tienda/carrito/carrito';
import { Checkout } from './features/tienda/checkout/checkout';
import { Confirmacion } from './features/tienda/confirmacion/confirmacion';
import { Seguimiento } from './features/tienda/seguimiento/seguimiento';
import { MisPedidos } from './features/tienda/mis-pedidos/mis-pedidos';
import { AppLayout } from './core/layout/app-layout/app-layout';
import { ClienteLayout } from './core/layout/cliente-layout/cliente-layout';
import { authGuard } from './core/guards/auth-guard';
import { rolGuard } from './core/guards/rol-guard';
import { TomarPedido } from './features/mesero/tomar-pedido/tomar-pedido';
import { PedidosPanel } from './features/pedidos/pedidos-panel/pedidos-panel';

export const routes: Routes = [
  { path: 'login', component: Login, title: 'Mr Lucho Panel' },
  {
    path: '',
    component: AppLayout,
    canActivate: [authGuard],
    title: 'Mr Lucho Panel',
    children: [
      { path: 'dashboard', component: Inicio, canActivate: [rolGuard], data: { roles: ['dueño'] } },
      { path: 'menu', component: ListaProductos, canActivate: [rolGuard], data: { roles: ['dueño'] } },
      { path: 'menu/nuevo', component: ProductoForm, canActivate: [rolGuard], data: { roles: ['dueño'] } },
      { path: 'menu/editar/:id', component: ProductoForm, canActivate: [rolGuard], data: { roles: ['dueño'] } },
      { path: 'pedidos', component: PedidosPanel, canActivate: [rolGuard], data: { roles: ['dueño', 'domicilios', 'mesera'] } },
      { path: 'reservas', component: ListaReservas, canActivate: [rolGuard], data: { roles: ['dueño'] } },
      { path: 'mesera', component: TomarPedido, canActivate: [rolGuard], data: { roles: ['dueño', 'mesera'] } },
    ]
  },

  { path: 'tienda', component: Registro, pathMatch: 'full', title: 'Mr Lucho Pedidos' },
  {
    path: 'tienda',
    component: ClienteLayout,
    title: 'Mr Lucho Pedidos',
    children: [
      { path: 'menu', component: Catalogo },
      { path: 'pedidos', component: MisPedidos },
      { path: 'carrito', component: Carrito },
      { path: 'checkout', component: Checkout },
      { path: 'confirmacion/:token', component: Confirmacion },
      { path: 'seguimiento/:token', component: Seguimiento },
    ]
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
