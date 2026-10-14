import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Pedido as PedidoService } from '../../../core/services/pedido';
import { ClienteService } from '../../../core/services/cliente';

const ETIQUETAS: { [key: string]: string } = {
  pendiente_verificacion: 'Recibido',
  aceptado: 'Aceptado',
  en_preparacion: 'En preparación',
  en_camino: 'En camino',
  entregado: 'Entregado',
  rechazado: 'Rechazado'
};

const FINALES = ['entregado', 'rechazado'];

@Component({
  selector: 'app-mis-pedidos',
  imports: [RouterLink, CommonModule],
  templateUrl: './mis-pedidos.html',
  styleUrl: './mis-pedidos.css'
})
export class MisPedidos implements OnInit {
  pedidos: any[] = [];
  cargando = true;

  constructor(
    private pedidoService: PedidoService,
    private clienteService: ClienteService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const cliente = this.clienteService.obtenerLocal();
    if (!cliente) {
      this.router.navigate(['/tienda']);
      return;
    }

    this.pedidoService.misPedidos(cliente.telefono).subscribe({
      next: (data) => {
        this.pedidos = data;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  get grupos() {
    const enCurso = this.pedidos.filter(p => !FINALES.includes(p.estado));
    const anteriores = this.pedidos.filter(p => FINALES.includes(p.estado));
    return [
      { titulo: 'En curso', items: enCurso },
      { titulo: 'Anteriores', items: anteriores }
    ].filter(g => g.items.length > 0);
  }

  etiqueta(estado: string): string {
    return ETIQUETAS[estado] ?? estado;
  }

  formatPrecio(precio: number): string {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(precio);
  }
}
