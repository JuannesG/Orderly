import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import * as L from 'leaflet';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideUser,
  LucidePhone,
  LucideHouse,
  LucideMapPin,
  LucideLocateFixed,
  LucideCircleCheck,
  LucideCircleAlert,
  LucideX,
  LucideArrowRight
} from '@lucide/angular';
import { ClienteService, Cliente } from '../../../core/services/cliente';

@Component({
  selector: 'app-registro',
  imports: [
    FormsModule,
    LucideUser,
    LucidePhone,
    LucideHouse,
    LucideMapPin,
    LucideLocateFixed,
    LucideCircleCheck,
    LucideCircleAlert,
    LucideX,
    LucideArrowRight
  ],
  templateUrl: './registro.html',
  styleUrl: './registro.css'
})
export class Registro implements OnInit {
  nombre = '';
  telefono = '';
  direccion = '';
  referencia = '';

  latitud: number | null = null;
  longitud: number | null = null;
  buscandoUbicacion = false;
  errorUbicacion = '';
  mostrarMapa = false;
  private mapa: L.Map | null = null;
  // Centro inicial si el GPS no responde: Barranquilla
  private readonly CENTRO_INICIAL: L.LatLngTuple = [10.9685, -74.7813];

  error = '';
  enviando = false;

  constructor(
    private clienteService: ClienteService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const guardado = this.clienteService.obtenerLocal();
    if (guardado) {
      this.router.navigate(['/tienda/menu']);
    }
  }

  get tieneUbicacion(): boolean {
    return this.latitud !== null && this.longitud !== null;
  }

  usarMiUbicacion() {
    if (this.buscandoUbicacion) return;
    this.errorUbicacion = '';

    if (!('geolocation' in navigator)) {
      this.errorUbicacion = 'Tu navegador no permite obtener la ubicación.';
      return;
    }

    this.buscandoUbicacion = true;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        this.latitud = lat;
        this.longitud = lng;
        this.mapa?.setView([lat, lng], 17);
        this.buscandoUbicacion = false;
        this.cdr.detectChanges();
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          this.errorUbicacion = 'No diste permiso para usar tu ubicación.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          this.errorUbicacion = 'No se pudo detectar tu ubicación. Revisa que el GPS esté activo.';
        } else {
          this.errorUbicacion = 'Tardó demasiado en detectar tu ubicación. Intenta de nuevo.';
        }
        this.buscandoUbicacion = false;
        this.cdr.detectChanges();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  quitarUbicacion() {
    this.mapa?.remove();
    this.mapa = null;
    this.mostrarMapa = false;
    this.latitud = null;
    this.longitud = null;
    this.errorUbicacion = '';
  }

  abrirMapa() {
    if (this.mapa) return;
    this.mostrarMapa = true;
    this.cdr.detectChanges(); // para que el div del mapa ya exista

    this.mapa = L.map('mapa-registro', { center: this.CENTRO_INICIAL, zoom: 15 });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.mapa);

    // Cada vez que el mapa deja de moverse, el centro es la ubicación
    this.mapa.on('moveend', () => {
      const centro = this.mapa!.getCenter();
      this.latitud = Number(centro.lat.toFixed(6));
      this.longitud = Number(centro.lng.toFixed(6));
      this.cdr.detectChanges();
    });

    this.usarMiUbicacion();
  }

  ngOnDestroy() {
    this.mapa?.remove();
  }

  onSubmit() {
    if (this.enviando) return;

    if (!this.nombre.trim() || !this.telefono.trim() || !this.direccion.trim()) {
      this.error = 'Completa tu nombre, teléfono y dirección para continuar.';
      return;
    }

    this.enviando = true;
    this.error = '';

    const cliente: Cliente = {
      nombre: this.nombre.trim(),
      telefono: this.telefono.trim(),
      direccion: this.direccion.trim(),
      referencia: this.referencia.trim(),
      latitud: this.latitud,
      longitud: this.longitud
    };

    this.clienteService.buscarPorTelefono(cliente.telefono).subscribe({
      next: () => {
        this.clienteService.actualizar(cliente.telefono, cliente).subscribe({
          next: (resp) => this.continuar(resp),
          error: (err) => this.manejarError(err)
        });
      },
      error: (err) => {
        if (err?.status === 0 || err?.status >= 500) {
          this.manejarError(err);
          return;
        }
        this.clienteService.crear(cliente).subscribe({
          next: (resp) => this.continuar(resp),
          error: (e) => this.manejarError(e)
        });
      }
    });
  }

  continuar(cliente: Cliente) {
    this.clienteService.guardarLocal(cliente);
    this.router.navigate(['/tienda/menu']);
  }

  private manejarError(err: any) {
    if (err?.status === 0) {
      this.error = 'No hay conexión. Revisa tu internet e intenta de nuevo.';
    } else if (err?.status === 400) {
      this.error = 'Revisa los datos que escribiste e intenta de nuevo.';
    } else {
      this.error = 'Tuvimos un problema. Intenta de nuevo en un momento.';
    }
    this.enviando = false;
    this.cdr.detectChanges();
  }
}
