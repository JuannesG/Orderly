import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Carrito as CarritoService, ItemCarrito } from '../../../core/services/carrito';
import { Menu, Adicion, Categoria } from '../../../core/services/menu';
import {
  LucideArrowLeft,
  LucideShoppingCart,
  LucidePlus,
  LucideMinus
} from '@lucide/angular';

const CATEGORIAS_SIN_ADICIONALES = ['bebida'];

@Component({
  selector: 'app-carrito',
  imports: [CommonModule, LucideArrowLeft, LucideShoppingCart, LucidePlus, LucideMinus],
  templateUrl: './carrito.html',
  styleUrl: './carrito.css'
})
export class Carrito implements OnInit {
  adicionesDisponibles: Adicion[] = [];
  categorias: Categoria[] = [];
  categoriasCargadas = false;
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

    this.menuService.getCategorias().subscribe({
      next: (data) => {
        this.categorias = data;
        this.categoriasCargadas = true;
        this.cdr.detectChanges();
      },
      error: () => {
        // Si no se pudieron cargar las categorías, se ofrecen adicionales como siempre.
        this.categoriasCargadas = true;
        this.cdr.detectChanges();
      }
    });
  }

  // El producto guarda el id de su categoría; aquí se convierte en el nombre.
  nombreCategoria(categoriaId: string | undefined): string {
    if (!categoriaId) return '';
    return this.categorias.find((c) => c.id === categoriaId)?.nombre ?? '';
  }

  // Las bebidas (y las categorías de la lista de arriba) no ofrecen adicionales.
  permiteAdicionales(item: ItemCarrito): boolean {
    if (!this.categoriasCargadas) return false;

    const nombre = this.nombreCategoria(item.producto.categoria)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    return !CATEGORIAS_SIN_ADICIONALES.some((texto) => nombre.includes(texto));
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
