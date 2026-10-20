import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Menu } from '../../../core/services/menu';
import {
  LucideShoppingBag,
  LucideBanknote,
  LucideCalendarDays,
  LucideFlame,
  LucideTrendingUp,
  LucideTrendingDown
} from '@lucide/angular';

const ETIQUETAS: { [key: string]: string } = {
  pendiente_verificacion: 'Pendiente',
  aceptado: 'Aceptado',
  en_preparacion: 'En preparación',
  en_camino: 'En camino',
  entregado: 'Entregado',
  rechazado: 'Rechazado'
};

const ESTADOS_LISTA = [
  { clave: 'pendiente_verificacion', nombre: 'Pendientes' },
  { clave: 'aceptado', nombre: 'Aceptados' },
  { clave: 'en_preparacion', nombre: 'En preparación' },
  { clave: 'en_camino', nombre: 'En camino' },
  { clave: 'entregado', nombre: 'Entregados' },
  { clave: 'rechazado', nombre: 'Rechazados' }
];

@Component({
  selector: 'app-inicio',
  imports: [
    LucideShoppingBag,
    LucideBanknote,
    LucideCalendarDays,
    LucideFlame,
    LucideTrendingUp,
    LucideTrendingDown
  ],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css'
})
export class Inicio implements OnInit {
  restauranteId = '';
  abierto = true;
  cargando = true;
  resumen: any = null;
  estadosLista = ESTADOS_LISTA;

  constructor(private menuService: Menu, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.restauranteId = localStorage.getItem('restaurante_id') ?? '';

    if (this.restauranteId) {
      this.menuService.getRestaurante(this.restauranteId).subscribe({
        next: (data) => this.abierto = data.abierto
      });
    } else {
      this.menuService.getPrimerRestaurante().subscribe({
        next: (data) => {
          if (data.length > 0) {
            this.restauranteId = data[0].id;
            localStorage.setItem('restaurante_id', this.restauranteId);
            this.abierto = data[0].abierto;
          }
        }
      });
    }

    this.cargarResumen();
  }

  cargarResumen() {
    this.menuService.getDashboardResumen().subscribe({
      next: (data) => {
        this.resumen = data;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleAbierto() {
    this.abierto = !this.abierto;
    this.menuService.actualizarEstadoRestaurante(this.restauranteId, this.abierto).subscribe();
  }

  formatPrecio(precio: number): string {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(precio);
  }

  etiqueta(estado: string): string {
    return ETIQUETAS[estado] ?? estado;
  }

  diferenciaPorcentual(hoy: number, ayer: number): string {
    if (ayer === 0) {
      return hoy > 0 ? '+100%' : '0%';
    }
    const diff = ((hoy - ayer) / ayer) * 100;
    const signo = diff >= 0 ? '+' : '';
    return `${signo}${diff.toFixed(0)}%`;
  }

  esPositivo(hoy: number, ayer: number): boolean {
    return hoy >= ayer;
  }

  alturaBarra(cantidad: number): number {
    if (!this.resumen?.grafica_semana) return 0;
    const maximo = Math.max(...this.resumen.grafica_semana.map((d: any) => d.cantidad), 1);
    return (cantidad / maximo) * 100;
  }

  nombreDia(fecha: string): string {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const d = new Date(fecha + 'T00:00:00');
    return dias[d.getDay()];
  }
}
