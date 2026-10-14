import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Carrito } from '../../services/carrito';
import { Menu } from '../../services/menu';

@Component({
  selector: 'app-cliente-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './cliente-layout.html',
  styleUrl: './cliente-layout.css',
})
export class ClienteLayout implements OnInit {
  whatsappRestaurante = '';

  constructor(
    public carrito: Carrito,
    private menuService: Menu,
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
  }

  get pedidoActivoToken(): string | null {
    return localStorage.getItem('pedido_activo_token');
  }

  get whatsappUrl(): string {
    const digitos = this.whatsappRestaurante.replace(/\D/g, '');
    const numero = digitos.length === 10 ? '57' + digitos : digitos;
    return `https://wa.me/${numero}`;
  }
}
