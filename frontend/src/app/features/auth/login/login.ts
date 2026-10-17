import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  username = '';
  password = '';
  error = '';

  constructor(private auth: Auth, private router: Router) {}

  onSubmit() {
    this.auth.login(this.username, this.password).subscribe({
      next: () => {
        const destino = this.auth.rutaInicio();
        if (destino === '/login') {
          this.auth.logout();
          this.error = 'Tu usuario no tiene un rol asignado. Avísale al administrador.';
          return;
        }
        this.router.navigate([destino]);
      },
    });
  }
}
