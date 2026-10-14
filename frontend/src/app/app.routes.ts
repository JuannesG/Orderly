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

export const routes: Routes = [
  { path: 'login', component: Login },
  {
    path: '',
    component: AppLayout,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: Inicio },
      { path: 'menu', component: ListaProductos },
      { path: 'menu/nuevo', component: ProductoForm },
      { path: 'menu/editar/:id', component: ProductoForm },
      { path: 'pedidos', component: ListaPedidos },
      { path: 'reservas', component: ListaReservas },
    ]
  },
  { path: 'tienda', component: Registro, pathMatch: 'full' },
  {
    path: 'tienda',
    component: ClienteLayout,
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
