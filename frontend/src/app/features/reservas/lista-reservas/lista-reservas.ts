import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucidePlus,
  LucideX,
  LucidePhone,
  LucideClock,
  LucideUsers,
  LucideTrash2
} from '@lucide/angular';
import { ReservaService, Reserva } from '../../../core/services/reserva';
import { ConfirmarAccion } from '../../../shared/confirmar-accion/confirmar-accion';

@Component({
  selector: 'app-lista-reservas',
  imports: [
    FormsModule,
    ConfirmarAccion,
    LucidePlus,
    LucideX,
    LucidePhone,
    LucideClock,
    LucideUsers,
    LucideTrash2
  ],
  templateUrl: './lista-reservas.html',
  styleUrl: './lista-reservas.css',
})
export class ListaReservas implements OnInit {
  reservas: Reserva[] = [];
  cargando = true;
  mostrarFormulario = false;
  soloHoy = true;
  errorForm = '';
  reservaPorEliminar: Reserva | null = null;

  nombreForm = '';
  telefonoForm = '';
  fechaForm = '';
  horaForm = '';
  personasForm: number | null = null;
  motivoForm = '';

  constructor(
    private reservaService: ReservaService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.cargarReservas();
  }

  cargarReservas() {
    this.cargando = true;
    this.reservaService.listar().subscribe({
      next: (data) => {
        this.reservas = data;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  get reservasVisibles(): Reserva[] {
    if (!this.soloHoy) return this.reservas;
    const d = new Date();
    const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return this.reservas.filter((r) => r.fecha === hoy);
  }

  toggleFormulario() {
    this.mostrarFormulario = !this.mostrarFormulario;
    this.errorForm = '';
    if (!this.mostrarFormulario) {
      this.limpiarFormulario();
    }
  }

  guardarReserva() {
    if (
      !this.nombreForm ||
      !this.telefonoForm ||
      !this.fechaForm ||
      !this.horaForm ||
      !this.personasForm
    ) {
      this.errorForm = 'Completa nombre, teléfono, fecha, hora y número de personas.';
      return;
    }
    this.errorForm = '';

    const restauranteId = localStorage.getItem('restaurante_id');
    if (!restauranteId) {
      alert('No se encontró el restaurante.');
      return;
    }

    const reserva: Reserva = {
      restaurante: restauranteId,
      nombre_cliente: this.nombreForm,
      telefono: this.telefonoForm,
      fecha: this.fechaForm,
      hora: this.horaForm,
      numero_personas: this.personasForm,
      motivo: this.motivoForm,
    };

    this.reservaService.crear(reserva).subscribe({
      next: () => {
        this.limpiarFormulario();
        this.mostrarFormulario = false;
        this.cargarReservas();
      },
      error: (err) => {
        console.error('Error al crear reserva:', err);
        alert('No se pudo crear la reserva.');
      },
    });
  }

  confirmarEliminar() {
    const reserva = this.reservaPorEliminar;
    this.reservaPorEliminar = null;
    if (!reserva?.id) return;
    this.reservaService.eliminar(reserva.id).subscribe(() => {
      this.cargarReservas();
    });
  }

  limpiarFormulario() {
    this.nombreForm = '';
    this.telefonoForm = '';
    this.fechaForm = '';
    this.horaForm = '';
    this.personasForm = null;
    this.motivoForm = '';
  }
}
