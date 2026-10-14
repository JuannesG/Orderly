import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Carrito as CarritoService, ItemCarrito } from '../../../core/services/carrito';
import { Menu, Adicion } from '../../../core/services/menu';


@Component({
  selector: 'app-carrito',
  imports: [CommonModule],
  templateUrl: './carrito.html',
  styleUrl: './carrito.css'
})
export class Carrito implements OnInit {
  adicionesDisponibles: Adicion[] = [];
  itemExpandido: string | null = null;

  constructor(
    public carrito: CarritoService,
    private menuService: Menu,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.menuService.getAdiciones().subscribe({
      next: (data) => {
        this.adicionesDisponibles = data;
        this.cdr.detectChanges();
      }
    });
  }

  formatPrecio(precio: number | string): string {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Number(precio));
  }

  subtotalItem(item: ItemCarrito): number {
    return this.carrito.precioItem(item);
  }

  agregar(item: ItemCarrito) {
    this.carrito.agregar(item.producto);
  }

  quitar(item: ItemCarrito) {
    this.carrito.quitar(item.producto.id);
  }

  toggleExpandido(productoId: string | undefined) {
    if (!productoId) return;
    this.itemExpandido = this.itemExpandido === productoId ? null : productoId;
  }

  toggleAdicional(item: ItemCarrito, adicional: Adicion) {
    this.carrito.toggleAdicional(item.producto.id, adicional);
  }

  seguirComprando() {
    this.router.navigate(['/tienda/menu']);
  }

  irAlCheckout() {
    this.router.navigate(['/tienda/checkout']);
  }
}
