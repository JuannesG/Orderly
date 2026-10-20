import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Menu, Categoria, Producto } from '../../../core/services/menu';
import { LucidePlus, LucidePencil, LucideTrash2 } from '@lucide/angular';

@Component({
  selector: 'app-lista-productos',
  imports: [FormsModule, LucidePlus, LucidePencil, LucideTrash2],
  templateUrl: './lista-productos.html',
  styleUrl: './lista-productos.css'
})
export class ListaProductos implements OnInit {
  categorias: Categoria[] = [];
  categoriasVisibles: Categoria[] = [];
  filtroActivo: string | null = null;
  cargando = true;

  mostrarFormCategoria = false;
  nombreCategoriaNueva = '';

  constructor(
    private menuService: Menu,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarMenu();
  }

  cargarMenu() {
    this.cargando = true;
    this.menuService.getCategorias().subscribe({
      next: (respuesta) => {
        this.categorias = respuesta;
        this.aplicarFiltro();
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  setFiltro(id: string | null) {
    this.filtroActivo = id;
    this.aplicarFiltro();
  }

  aplicarFiltro() {
    this.categoriasVisibles = this.filtroActivo
      ? this.categorias.filter(c => c.id === this.filtroActivo)
      : this.categorias;
  }

  formatPrecio(precio: number | string): string {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Number(precio));
  }

  irANuevoProducto() {
    this.router.navigate(['/menu/nuevo']);
  }

  irAEditar(id: string | undefined) {
    if (!id) return;
    this.router.navigate(['/menu/editar', id]);
  }

  eliminarProducto(id: string | undefined) {
    if (!id) return;
    if (!confirm('¿Seguro que quieres eliminar este producto?')) return;

    this.menuService.eliminarProducto(id).subscribe({
      next: () => this.cargarMenu(),
      error: (err) => alert(this.mensajeError(err, 'No se pudo eliminar el producto.'))
    });
  }

  cambiarDisponibilidad(producto: Producto) {
    if (!producto.id) return;

    const nuevoValor = !producto.disponible;

    this.menuService.cambiarDisponibilidad(producto.id, nuevoValor).subscribe({
      next: () => {
        producto.disponible = nuevoValor;
        this.cdr.detectChanges();
      },
      error: (err) => alert(this.mensajeError(err, 'No se pudo cambiar la disponibilidad.'))
    });
  }

  toggleFormCategoria() {
    this.mostrarFormCategoria = !this.mostrarFormCategoria;
    this.nombreCategoriaNueva = '';
  }

  crearCategoria() {
    if (!this.nombreCategoriaNueva.trim()) return;

    this.menuService.crearCategoria(this.nombreCategoriaNueva.trim()).subscribe({
      next: () => {
        this.nombreCategoriaNueva = '';
        this.mostrarFormCategoria = false;
        this.cargarMenu();
      },
      error: (err) => alert(this.mensajeError(err, 'No se pudo crear la categoría.'))
    });
  }

  eliminarCategoria(categoria: Categoria) {
    if (!categoria.id) return;

    const cantidad = categoria.productos?.length ?? 0;
    const aviso = cantidad > 0
      ? `¿Eliminar la categoría "${categoria.nombre}" y sus ${cantidad} producto(s)? No se puede deshacer.`
      : `¿Eliminar la categoría "${categoria.nombre}"?`;

    if (!confirm(aviso)) return;

    this.menuService.eliminarCategoria(categoria.id).subscribe({
      next: () => {
        if (this.filtroActivo === categoria.id) {
          this.filtroActivo = null;
        }
        this.cargarMenu();
      },
      error: (err) => alert(this.mensajeError(err, 'No se pudo eliminar la categoría.'))
    });
  }

  private mensajeError(err: any, porDefecto: string): string {
    const e = err?.error;
    if (e?.detail) return e.detail;
    if (e && typeof e === 'object') return Object.values(e).flat().join(' ');
    return porDefecto;
  }
}
