import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { Auth } from '../../services/auth';
import {
  LucideHouse,
  LucideBookOpen,
  LucideClipboardList,
  LucideUtensils,
  LucideCalendarDays,
  LucideLogOut
} from '@lucide/angular';

@Component({
  selector: 'app-app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideHouse, LucideBookOpen, LucideClipboardList, LucideUtensils, LucideCalendarDays, LucideLogOut],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.css'
})
export class AppLayout {
  constructor(private auth: Auth, private router: Router) {}

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
