import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pedido as PedidoService } from '../../../core/services/pedido';
import { AvisoSonoro } from '../../../core/services/aviso-sonoro';

const ETIQUETAS: { [key: string]: string } = {
  pendiente_verificacion: 'Pendiente',
  aceptado: 'Aceptado',
  en_preparacion: 'En preparación',
  en_camino: 'En camino',
  entregado: 'Entregado',
  rechazado: 'Rechazado'
};

const METODOS: { [key: string]: string } = {
  nequi: 'Nequi',
  bancolombia: 'Bancolombia',
  efectivo: 'Efectivo'
};

const ESTADOS_BOTONES = ['aceptado', 'en_preparacion', 'en_camino', 'entregado'];
const FINALES = ['entregado', 'rechazado'];

@Component({
  selector: 'app-lista-pedidos',
  imports: [CommonModule],
  templateUrl: './lista-pedidos.html',
  styleUrl: './lista-pedidos.css'
})
export class ListaPedidos implements OnInit, OnDestroy {
  pedidos: any[] = [];
  cargando = true;
  filtro: 'activos' | 'hoy' | 'todos' = 'activos';
  estadosBotones = ESTADOS_BOTONES;
  comprobanteAbierto: string | null = null;

  private intervalId: any;

  private conocidos = new Set<string>();
  private primeraCarga = true;

    constructor(
    private pedidoService: PedidoService,
    public aviso: AvisoSonoro,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarPedidos();
    this.intervalId = setInterval(() => this.cargarPedidos(true), 6000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  cargarPedidos(esActualizacion = false) {
    if (!esActualizacion) {
      this.cargando = true;
    }

    this.pedidoService.listar().subscribe({
      next: (data) => {
        this.avisarNuevos(data);
        this.pedidos = data;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        if (!esActualizacion) {
          this.cargando = false;
          this.cdr.detectChanges();
        }
      }
    });
  }

  get contarActivos(): number {
    return this.pedidos.filter(p => !FINALES.includes(p.estado)).length;
  }

  get pedidosVisibles(): any[] {
    if (this.filtro === 'activos') {
      return this.pedidos.filter(p => !FINALES.includes(p.estado));
    }
    if (this.filtro === 'hoy') {
      const hoy = new Date().toDateString();
      return this.pedidos.filter(p => new Date(p.creado_en).toDateString() === hoy);
    }
    return this.pedidos;
  }

  etiqueta(estado: string): string {
    return ETIQUETAS[estado] ?? estado;
  }

  metodoLabel(metodo: string | undefined): string {
    return metodo ? (METODOS[metodo] ?? metodo) : '';
  }

  formatPrecio(precio: number): string {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(precio);
  }

  urlComprobante(pedido: any): string | null {
    const pago = pedido.pago;
    return pago?.comprobante_url || pago?.comprobante || null;
  }

  verComprobante(url: string) {
    this.comprobanteAbierto = url;
  }

    cambiarAEstado(pedido: any, estado: string) {
    if (estado === 'entregado' && !window.confirm('¿Marcar como entregado? Ya no se podrá cambiar.')) {
      return;
    }
    this.pedidoService.cambiarEstado(pedido.token_seguimiento, estado).subscribe({
      next: () => this.cargarPedidos(true),
      error: () => this.cargarPedidos(true)
    });
  }

  imprimir(pedido: any) {
    this.pedidoService.imprimir(pedido.token_seguimiento).subscribe({
      next: () => this.cargarPedidos(true),
      error: () => this.cargarPedidos(true)
    });
  }

  alternarSonido() {
    if (this.aviso.activo) {
      this.aviso.desactivar();
    } else {
      this.aviso.activar();
    }
  }

  private avisarNuevos(data: any[]) {
    const hayNuevos = data.some((p) => !this.conocidos.has(p.token_seguimiento));
    if (hayNuevos && !this.primeraCarga && this.aviso.activo) {
      this.aviso.sonar();
    }
    data.forEach((p) => this.conocidos.add(p.token_seguimiento));
    this.primeraCarga = false;
  }

  verificarPago(pedido: any, aprobado: boolean) {
    const nuevoEstado = aprobado ? 'aceptado' : 'rechazado';

    this.pedidoService.verificarPago(pedido.pago.id, nuevoEstado).subscribe({
      next: () => {
        this.pedidoService.cambiarEstado(pedido.token_seguimiento, nuevoEstado).subscribe({
          next: () => this.cargarPedidos(true)
        });
      }
    });
  }

  reactivar(pedido: any) {
    const estadoPago = pedido.pago?.metodo === 'efectivo' ? 'aceptado' : 'pendiente_verificacion';

    this.pedidoService.verificarPago(pedido.pago.id, estadoPago).subscribe({
      next: () => {
        this.pedidoService.cambiarEstado(pedido.token_seguimiento, 'pendiente_verificacion').subscribe({
          next: () => this.cargarPedidos(true)
        });
      }
    });
  }
}
