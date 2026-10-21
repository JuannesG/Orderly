import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideLock,
  LucideEye,
  LucideEyeOff,
  LucideCircleAlert,
  LucideCheck
} from '@lucide/angular';
import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-cambiar-clave',
  imports: [FormsModule, LucideLock, LucideEye, LucideEyeOff, LucideCircleAlert, LucideCheck],
  templateUrl: './cambiar-clave.html',
  styleUrl: './cambiar-clave.css'
})
export class CambiarClave {
  claveActual = '';
  claveNueva = '';
  claveRepetida = '';
  mostrarClaves = false;
  error = '';
  cargando = false;

  constructor(
    private auth: Auth,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  get obligatorio(): boolean {
    return this.auth.debeCambiarClave();
  }

  get nombre(): string {
    return this.auth.nombre();
  }

  onSubmit() {
    if (this.cargando) return;

    if (!this.claveActual || !this.claveNueva || !this.claveRepetida) {
      this.error = 'Completa los tres campos.';
      return;
    }
    if (this.claveNueva.length < 8) {
      this.error = 'La contraseña nueva debe tener al menos 8 caracteres.';
      return;
    }
    if (this.claveNueva !== this.claveRepetida) {
      this.error = 'Las contraseñas nuevas no coinciden.';
      return;
    }

    this.cargando = true;
    this.error = '';

    this.auth.cambiarClave(this.claveActual, this.claveNueva).subscribe({
      next: () => {
        this.router.navigate([this.auth.rutaInicio()]);
      },
      error: (err) => {
        if (err?.status === 401) {
          this.auth.logout();
          this.router.navigate(['/login']);
          return;
        }
        this.error = this.mensajeError(err);
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  volver() {
    this.router.navigate([this.auth.rutaInicio()]);
  }

  salir() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  private mensajeError(err: any): string {
    if (err?.status === 0) {
      return 'No hay conexión con el servidor. Revisa el internet e intenta de nuevo.';
    }
    const e = err?.error;
    if (err?.status === 400 && e && typeof e === 'object') {
      const partes = Object.values(e).flat().map(String);
      if (partes.length) return partes.join(' ');
    }
    return 'El servidor tuvo un problema. Intenta de nuevo en un momento.';
  }
}
