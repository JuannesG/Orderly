import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pedido as PedidoService } from '../../../core/services/pedido';
import { AvisoSonoro } from '../../../core/services/aviso-sonoro';
import { Auth } from '../../../core/services/auth';
import { ConfirmarAccion } from '../../../shared/confirmar-accion/confirmar-accion';
import { Recibo } from '../../../core/services/recibo';

const ETIQUETAS: { [key: string]: string } = {
  aceptado: 'Nuevo · sin imprimir',
  en_preparacion: 'En preparación',
  entregado: 'Entregado',
};

const ZONAS: { [key: string]: string } = {
  salon: 'Salón',
  terraza: 'Terraza',
  para_llevar: 'Para llevar',
};

type Filtro = 'activos' | 'hoy' | 'todos';

@Component({
  selector: 'app-pedidos-local',
  imports: [CommonModule, ConfirmarAccion],
  templateUrl: './pedidos-local.html',
  styleUrl: './pedidos-local.css',
})
export class PedidosLocal implements OnInit, OnDestroy {
  pedidos: any[] = [];
  cargando = true;
  error = '';
  filtro: Filtro = 'activos';
  soloMios = false;
  ocupado: string | null = null;
  pedidoPorEntregar: any | null = null;

  private intervalId: any;
  private conocidos = new Set<string>();
  private primeraCarga = true;

  constructor(
    private pedidoService: PedidoService,
    public aviso: AvisoSonoro,
    private auth: Auth,
    private recibo: Recibo,
    private cdr: ChangeDetectorRef,
  ) {}

  get esDueno(): boolean {
    return this.auth.rol() === 'dueño';
  }

  ngOnInit() {
    this.cargarPedidos();
    this.intervalId = setInterval(() => this.cargarPedidos(true), 6000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  cambiarFiltro(filtro: Filtro) {
    this.filtro = filtro;
    this.cargarPedidos();
  }

  alternarMios() {
    this.soloMios = !this.soloMios;
    this.cargarPedidos();
  }

  alternarSonido() {
    if (this.aviso.activo && this.aviso.listo) {
      this.aviso.desactivar();
    } else {
      this.aviso.activar();
    }
  }

  cargarPedidos(esActualizacion = false) {
    if (!esActualizacion) {
      this.cargando = true;
      // Al cambiar de filtro no queremos que todo cuente como "pedido nuevo".
      this.primeraCarga = true;
      this.conocidos.clear();
    }

    this.pedidoService.listarLocal(this.filtro, this.soloMios).subscribe({
      next: (data) => {
        this.avisarNuevos(data);
        this.pedidos = data;
        this.cargando = false;
        this.error = '';
        this.cdr.detectChanges();
      },
      error: () => {
        if (!esActualizacion) {
          this.cargando = false;
          this.error = 'No se pudieron cargar los pedidos.';
          this.cdr.detectChanges();
        }
      },
    });
  }

  private avisarNuevos(data: any[]) {
    const hayNuevos = data.some((p) => !this.conocidos.has(p.token_seguimiento));
    if (hayNuevos && !this.primeraCarga && this.esDueno && this.aviso.activo) {
      this.aviso.sonar();
    }
    data.forEach((p) => this.conocidos.add(p.token_seguimiento));
    this.primeraCarga = false;
  }

  etiqueta(estado: string): string {
    return ETIQUETAS[estado] ?? estado;
  }

  destino(pedido: any): string {
    const zona = ZONAS[pedido.zona] ?? pedido.zona;
    if (pedido.zona === 'para_llevar') return `${zona} · ${pedido.nota}`;
    return `${zona} · Mesa ${pedido.mesa}`;
  }

  // Tolera el nombre del campo, venga como mesera_nombre o mesero_nombre.
  nombreMesera(pedido: any): string {
    return pedido.mesera_nombre ?? pedido.mesero_nombre ?? '';
  }

  formatPrecio(precio: number | string): string {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Number(precio));
  }

  imprimir(pedido: any) {
    this.ocupado = pedido.token_seguimiento;
    this.pedidoService.imprimir(pedido.token_seguimiento).subscribe({
      next: () => {
        this.recibo.imprimir(pedido);
        this.terminar();
      },
      error: () => this.terminar('No se pudo imprimir el pedido. Intenta de nuevo.'),
    });
  }

  reimprimir(pedido: any) {
    this.recibo.imprimir(pedido);
  }

  confirmarEntrega() {
    const pedido = this.pedidoPorEntregar;
    this.pedidoPorEntregar = null;
    if (!pedido) return;

    this.ocupado = pedido.token_seguimiento;
    this.pedidoService.marcarEntregado(pedido.token_seguimiento).subscribe({
      next: () => this.terminar(),
      error: () => this.terminar('No se pudo marcar como entregado. Intenta de nuevo.'),
    });
  }

  private terminar(mensajeError = '') {
    this.ocupado = null;
    this.error = mensajeError;
    this.cargarPedidos(true);
    this.cdr.detectChanges();
  }
}
