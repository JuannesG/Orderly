import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Carrito } from '../../services/carrito';
import { Menu } from '../../services/menu';
import { Pedido as PedidoService } from '../../services/pedido';
import {
  LucideUtensils,
  LucideClipboardList,
  LucideBike,
  LucideMessageCircle,
  LucideShoppingCart
} from '@lucide/angular';

@Component({
  selector: 'app-cliente-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideUtensils,
    LucideClipboardList,
    LucideBike,
    LucideMessageCircle,
    LucideShoppingCart
  ],
  templateUrl: './cliente-layout.html',
  styleUrl: './cliente-layout.css',
})
export class ClienteLayout implements OnInit, OnDestroy {
  whatsappRestaurante = '';

  enCursoToken: string | null = null;

  private intervalId: any;
  private navSub?: Subscription;

  constructor(
    public carrito: Carrito,
    private menuService: Menu,
    private pedidoService: PedidoService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.menuService.getPrimerRestaurante().subscribe({
      next: (data) => {
        if (data.length > 0) {
          this.whatsappRestaurante = data[0].whatsapp_numero ?? '';
          this.cdr.detectChanges();
        }
      },
    });

    this.revisarPedidoEnCurso();
    this.navSub = this.router.events
      .pipe(filter((evento) => evento instanceof NavigationEnd))
      .subscribe(() => this.revisarPedidoEnCurso());
    this.intervalId = setInterval(() => this.revisarPedidoEnCurso(), 6000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.navSub?.unsubscribe();
  }

  private revisarPedidoEnCurso() {
    const token = localStorage.getItem('pedido_activo_token');

    if (!token) {
      this.actualizarEnCurso(null);
      return;
    }

    this.pedidoService.obtenerPorToken(token).subscribe({
      next: (pedido) => {
        if (pedido.estado === 'entregado') {
          localStorage.removeItem('pedido_activo_token');
          this.actualizarEnCurso(null);
        } else if (pedido.estado === 'rechazado') {
          this.actualizarEnCurso(null);
        } else {
          this.actualizarEnCurso(token);
        }
      },
      error: (err) => {
        if (err.status === 404) {
          localStorage.removeItem('pedido_activo_token');
          this.actualizarEnCurso(null);
        }
      },
    });
  }

  private actualizarEnCurso(valor: string | null) {
    if (this.enCursoToken !== valor) {
      this.enCursoToken = valor;
      this.cdr.detectChanges();
    }
  }

  get whatsappUrl(): string {
    const digitos = this.whatsappRestaurante.replace(/\D/g, '');
    const numero = digitos.length === 10 ? '57' + digitos : digitos;
    return `https://wa.me/${numero}`;
  }
}
