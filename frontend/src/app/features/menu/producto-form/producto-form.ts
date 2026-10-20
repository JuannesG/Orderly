import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Menu, Categoria, Producto } from '../../../core/services/menu';
import { LucideArrowLeft } from '@lucide/angular';

@Component({
  selector: 'app-producto-form',
  imports: [FormsModule, LucideArrowLeft],
  templateUrl: './producto-form.html',
  styleUrl: './producto-form.css',
})
export class ProductoForm implements OnInit {
  categorias: Categoria[] = [];
  productoEditandoId: string | null = null;

  nombreForm = '';
  descripcionForm = '';
  precioForm: number | null = null;
  categoriaForm = '';

  constructor(
    private menuService: Menu,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.menuService.getCategorias().subscribe({
      next: (respuesta) => {
        this.categorias = respuesta;
        this.cdr.detectChanges();
      },
    });

    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.productoEditandoId = id;
      this.menuService.getProductos().subscribe({
        next: (productos) => {
          const producto = productos.find((p) => p.id === id);
          if (producto) {
            this.nombreForm = producto.nombre;
            this.descripcionForm = producto.descripcion ?? '';
            this.precioForm = producto.precio;
            this.categoriaForm = producto.categoria;
            this.cdr.detectChanges();
          }
        },
      });
    }
  }

  private mensajeError(err: any): string {
    const e = err?.error;
    if (e?.detail) return e.detail;
    if (e && typeof e === 'object') return Object.values(e).flat().join(' ');
    return 'Error del servidor (revisa la terminal de Django).';
  }

  onSubmit() {
    if (!this.nombreForm || !this.precioForm || !this.categoriaForm) {
      return;
    }

    const producto: Producto = {
      nombre: this.nombreForm,
      descripcion: this.descripcionForm,
      precio: this.precioForm,
      categoria: this.categoriaForm,
      disponible: true,
    };

    if (this.productoEditandoId) {
      this.menuService.actualizarProducto(this.productoEditandoId, producto).subscribe({
        next: () => this.router.navigate(['/menu']),
        error: (err) => {
          console.error('Error al actualizar:', err);
          alert('No se pudo guardar: ' + this.mensajeError(err));
        },
      });
    } else {
      this.menuService.crearProducto(producto).subscribe({
        next: () => this.router.navigate(['/menu']),
        error: (err) => {
          console.error('Error al crear:', err);
          alert('No se pudo crear: ' + this.mensajeError(err));
        },
      });
    }
  }

  cancelar() {
    this.router.navigate(['/menu']);
  }
}
