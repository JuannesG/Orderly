import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Pedido as PedidoService } from '../../../core/services/pedido';
import {
  LucideReceipt,
  LucideCircleCheck,
  LucideChefHat,
  LucideBike,
  LucideHouse,
  LucidePhone,
  LucideMessageCircle,
  LucideChevronDown,
  LucideChevronUp
} from '@lucide/angular';

const ESTADOS_ORDEN = ['pendiente_verificacion', 'aceptado', 'en_preparacion', 'en_camino', 'entregado'];

const PASOS = [
  { estado: 'pendiente_verificacion', etiqueta: 'Recibido' },
  { estado: 'aceptado', etiqueta: 'Aceptado' },
  { estado: 'en_preparacion', etiqueta: 'Preparación' },
  { estado: 'en_camino', etiqueta: 'En camino' },
  { estado: 'entregado', etiqueta: 'Entregado' }
];


const METODOS: { [key: string]: string } = {
  nequi: 'Nequi',
  bancolombia: 'Bancolombia',
  efectivo: 'Efectivo'
};

@Component({
  selector: 'app-seguimiento',
  imports: [
    LucideReceipt,
    LucideCircleCheck,
    LucideChefHat,
    LucideBike,
    LucideHouse,
    LucidePhone,
    LucideMessageCircle,
    LucideChevronDown,
    LucideChevronUp
  ],
  templateUrl: './seguimiento.html',
  styleUrl: './seguimiento.css'
})
export class Seguimiento implements OnInit, OnDestroy {
  pedido: any = null;
  cargando = true;
  error = false;
  pasos = PASOS;
  token = '';
  seccionAbierta: string | null = null;

  private intervalId: any;

  constructor(
    private route: ActivatedRoute,
    private pedidoService: PedidoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';

    if (!this.token) {
      this.error = true;
      this.cargando = false;
      return;
    }

    this.cargarPedido();
    this.intervalId = setInterval(() => this.cargarPedido(true), 6000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  cargarPedido(esActualizacion = false) {
    this.pedidoService.obtenerPorToken(this.token).subscribe({
      next: (data) => {
        this.pedido = data;

        // Solo se deja de consultar al entregar. Un pedido rechazado se sigue
        // consultando por si el restaurante lo reactiva.
        if (data.estado === 'entregado') {
          localStorage.removeItem('pedido_activo_token');
          if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
          }
        }

        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        if (!esActualizacion) {
          this.error = true;
          this.cargando = false;
          this.cdr.detectChanges();
        }
      }
    });
  }

  pasoActivo(estado: string): boolean {
    if (!this.pedido) return false;
    return ESTADOS_ORDEN.indexOf(estado) <= ESTADOS_ORDEN.indexOf(this.pedido.estado);
  }

  toggleSeccion(nombre: string) {
    this.seccionAbierta = this.seccionAbierta === nombre ? null : nombre;
  }

  metodoLabel(): string {
    return METODOS[this.pedido?.metodo_pago] ?? '';
  }

  pagoLabel(): string {
    if (!this.pedido) return '';
    if (this.pedido.metodo_pago === 'efectivo') return 'Contraentrega';
    const mapa: { [key: string]: string } = {
      pendiente_verificacion: 'Verificando',
      aceptado: 'Confirmado',
      rechazado: 'Rechazado'
    };
    return mapa[this.pedido.estado_pago] ?? '';
  }

  pagoClase(): string {
    if (!this.pedido || this.pedido.metodo_pago === 'efectivo') return '';
    return this.pedido.estado_pago === 'aceptado' ? 'ok' : 'alerta';
  }

  get digitosWhatsapp(): string {
    const digitos = (this.pedido?.restaurante_whatsapp ?? '').replace(/\D/g, '');
    return digitos.length === 10 ? '57' + digitos : digitos;
  }

  get whatsappUrl(): string {
    return `https://wa.me/${this.digitosWhatsapp}`;
  }

  get telUrl(): string {
    return `tel:+${this.digitosWhatsapp}`;
  }

  formatPrecio(precio: number): string {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(precio);
  }
}
