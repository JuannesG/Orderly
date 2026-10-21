import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
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
  LucideChartColumn
} from '@lucide/angular';

@Component({
  selector: 'app-app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideHouse, LucideBookOpen, LucideClipboardList, LucideUtensils,
    LucideCalendarDays, LucideLogOut, LucideUser, LucideUsers, LucideChartColumn],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.css'
})
export class AppLayout {
  constructor(private auth: Auth, private router: Router) {}

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

  cerrarSesion() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
