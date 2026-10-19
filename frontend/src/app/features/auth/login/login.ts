import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideChefHat,
  LucideBeef,
  LucideUtensilsCrossed,
  LucideFlame,
  LucideUser,
  LucideLock,
  LucideEye,
  LucideEyeOff,
  LucideCircleAlert,
  LucideLogIn
} from '@lucide/angular';
import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    LucideChefHat,
    LucideBeef,
    LucideUtensilsCrossed,
    LucideFlame,
    LucideUser,
    LucideLock,
    LucideEye,
    LucideEyeOff,
    LucideCircleAlert,
    LucideLogIn
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  username = '';
  password = '';
  error = '';
  cargando = false;
  mostrarClave = false;

  constructor(
    private auth: Auth,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  onSubmit() {
    if (this.cargando) return;

    this.cargando = true;
    this.error = '';

    this.auth.login(this.username.trim(), this.password).subscribe({
      next: () => {
        const destino = this.auth.rutaInicio();
        if (destino === '/login') {
          this.auth.logout();
          this.error = 'Tu usuario no tiene un rol asignado. Avísale al administrador.';
          this.cargando = false;
          this.cdr.detectChanges();
          return;
        }
        this.router.navigate([destino]);
      },
      error: (err) => {
        if (err?.status === 401) {
          this.error = 'Usuario o contraseña incorrectos.';
        } else if (err?.status === 0) {
          this.error = 'No hay conexión con el servidor. Revisa el internet e intenta de nuevo.';
        } else {
          this.error = 'El servidor tuvo un problema. Intenta de nuevo en un momento.';
        }
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }
}
