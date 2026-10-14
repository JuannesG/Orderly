import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Pedido as PedidoService } from '../../../core/services/pedido';
import { Carrito } from '../../../core/services/carrito';

@Component({
  selector: 'app-confirmacion',
  imports: [RouterLink],
  templateUrl: './confirmacion.html',
  styleUrl: './confirmacion.css'
})
export class Confirmacion implements OnInit {
  token = '';
  cargando = true;
  error = false;

  constructor(
    private route: ActivatedRoute,
    private pedidoService: PedidoService,
    private carrito: Carrito,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';

    if (!this.token) {
      this.error = true;
      this.cargando = false;
      return;
    }

    this.pedidoService.obtenerPorToken(this.token).subscribe({
      next: () => {
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = true;
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }
}
