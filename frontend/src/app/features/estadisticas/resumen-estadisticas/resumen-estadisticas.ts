import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideBanknote,
  LucideShoppingBag,
  LucideReceipt,
  LucideBike,
  LucideStore
} from '@lucide/angular';
import { EstadisticasService, ResumenVentas } from '../../../core/services/estadisticas';

type Periodo = 'hoy' | '7dias' | 'mes' | 'rango';

const PERIODOS: { clave: Periodo; nombre: string }[] = [
  { clave: 'hoy', nombre: 'Hoy' },
  { clave: '7dias', nombre: '7 días' },
  { clave: 'mes', nombre: 'Este mes' },
  { clave: 'rango', nombre: 'Rango' }
];

@Component({
  selector: 'app-resumen-estadisticas',
  imports: [FormsModule, LucideBanknote, LucideShoppingBag, LucideReceipt, LucideBike, LucideStore],
  templateUrl: './resumen-estadisticas.html',
  styleUrl: './resumen-estadisticas.css'
})
export class ResumenEstadisticas implements OnInit {
  periodos = PERIODOS;
  periodo: Periodo = 'hoy';
  desde = '';
  hasta = '';

  resumen: ResumenVentas | null = null;
  cargando = true;
  error = '';

  constructor(private estadisticasService: EstadisticasService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.elegirPeriodo('hoy');
  }

  // Fecha local como AAAA-MM-DD. No usar toISOString(): trabaja en UTC y desfasa el día.
  private fechaISO(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  elegirPeriodo(periodo: Periodo) {
    this.periodo = periodo;
    this.error = '';

    // En "Rango" se conservan las fechas actuales y se espera al botón Aplicar
    if (periodo === 'rango') return;

    const hoy = new Date();
    this.hasta = this.fechaISO(hoy);

    if (periodo === 'hoy') {
      this.desde = this.hasta;
    } else if (periodo === '7dias') {
      const inicio = new Date(hoy);
      inicio.setDate(hoy.getDate() - 6);
      this.desde = this.fechaISO(inicio);
    } else {
      this.desde = this.fechaISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    }

    this.cargar();
  }

  aplicarRango() {
    if (!this.desde || !this.hasta) {
      this.error = 'Elige la fecha inicial y la final.';
      return;
    }
    if (this.desde > this.hasta) {
      this.error = 'La fecha inicial no puede ser mayor que la final.';
      return;
    }
    this.cargar();
  }

  cargar() {
    this.cargando = true;
    this.error = '';

    this.estadisticasService.getResumen(this.desde, this.hasta).subscribe({
      next: (data) => {
        this.resumen = data;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.detail ?? 'No se pudieron cargar las estadísticas.';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  formatPrecio(valor: number): string {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(valor);
  }

  porcentaje(parte: number): number {
    if (!this.resumen || !this.resumen.ventas_total) return 0;
    return Math.round((parte * 100) / this.resumen.ventas_total);
  }
}
