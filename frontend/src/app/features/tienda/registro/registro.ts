import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ClienteService, Cliente } from '../../../core/services/cliente';

@Component({
  selector: 'app-registro',
  imports: [FormsModule],
  templateUrl: './registro.html',
  styleUrl: './registro.css'
})
export class Registro implements OnInit {
  nombre = '';
  telefono = '';
  direccion = '';
  referencia = '';

  ngOnInit() {
    const guardado = this.clienteService.obtenerLocal();
    if (guardado) {
      this.router.navigate(['/tienda/menu']);
    }
  }

  constructor(private clienteService: ClienteService, private router: Router) {}

  onSubmit() {
    if (!this.nombre || !this.telefono || !this.direccion) return;

    const cliente: Cliente = {
      nombre: this.nombre,
      telefono: this.telefono,
      direccion: this.direccion,
      referencia: this.referencia
    };

    this.clienteService.buscarPorTelefono(this.telefono).subscribe({
      next: () => {
        this.clienteService.actualizar(this.telefono, cliente).subscribe({
          next: (resp) => this.continuar(resp)
        });
      },
      error: () => {
        this.clienteService.crear(cliente).subscribe({
          next: (resp) => this.continuar(resp)
        });
      }
    });
  }

  continuar(cliente: Cliente) {
    this.clienteService.guardarLocal(cliente);
    this.router.navigate(['/tienda/menu']);
  }
}
