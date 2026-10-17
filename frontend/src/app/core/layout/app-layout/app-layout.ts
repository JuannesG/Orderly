import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.css'
})
export class AppLayout {
  constructor(private auth: Auth, private router: Router) {}

  get esDueno(): boolean {
    return this.auth.rol() === 'dueño';
  }

  cerrarSesion() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
