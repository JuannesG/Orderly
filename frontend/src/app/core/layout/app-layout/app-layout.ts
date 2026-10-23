import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { Auth } from '../../services/auth';
import {
  LucideHouse,
  LucideBookOpen,
  LucideClipboardList,
  LucideUtensils,
  LucideCalendarDays,
  LucideLogOut,
  LucideUser,
  LucideUsers,
  LucideChartColumn,
  LucideEllipsis
} from '@lucide/angular';

@Component({
  selector: 'app-app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideHouse, LucideBookOpen, LucideClipboardList, LucideUtensils,
    LucideCalendarDays, LucideLogOut, LucideUser, LucideUsers, LucideChartColumn, LucideEllipsis],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.css'
})
export class AppLayout {
  masAbierto = false;

  constructor(private auth: Auth, private router: Router) {
    // Al cambiar de pantalla, la tarjeta de "Más" se cierra sola
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => (this.masAbierto = false));
  }

  get nombre(): string {
    return this.auth.nombre();
  }

  get rolEtiqueta(): string {
    const etiquetas: { [rol: string]: string } = {
      'dueño': 'Dueño',
      domicilios: 'Domicilios',
      mesera: 'Mesera'
    };
    return etiquetas[this.auth.rol() ?? ''] ?? '';
  }

  get esDueno(): boolean {
    return this.auth.rol() === 'dueño';
  }

  get veDomicilios(): boolean {
    return ['dueño', 'domicilios'].includes(this.auth.rol() ?? '');
  }

  get veLocal(): boolean {
    return ['dueño', 'mesera'].includes(this.auth.rol() ?? '');
  }

  alternarMas() {
    this.masAbierto = !this.masAbierto;
  }

  cerrarMas() {
    this.masAbierto = false;
  }

  // Para resaltar "Más" cuando estás en una de las pantallas que esconde
  get enSecundaria(): boolean {
    return ['/reservas', '/estadisticas', '/equipo'].some((ruta) => this.router.url.startsWith(ruta));
  }

  cerrarSesion() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
