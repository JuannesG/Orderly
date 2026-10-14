import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Menu, Categoria, Producto, Adicion } from '../../../core/services/menu';
import { Carrito } from '../../../core/services/carrito';
import { ClienteService } from '../../../core/services/cliente';

@Component({
  selector: 'app-catalogo',
  imports: [FormsModule],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css'
})
export class Catalogo implements OnInit {
  categorias: Categoria[] = [];
  categoriasVisibles: Categoria[] = [];
  adiciones: Adicion[] = [];
  filtroActivo: string | null = null;
  busqueda = '';
  cargando = true;
  direccionCliente = '';
  tiendaAbierta = true;
  whatsappRestaurante = '';
  pedidoActivoToken: string | null = null;

  editandoDireccion = false;
  direccionEditada = '';

  productoDetalle: Producto | null = null;
  cantidadDetalle = 1;
  adicionesDetalle: Adicion[] = [];

  constructor(
    private menuService: Menu,
    public carrito: Carrito,
    private clienteService: ClienteService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const cliente = this.clienteService.obtenerLocal();
    if (!cliente) {
      this.router.navigate(['/tienda']);
      return;
    }
    this.direccionCliente = cliente.direccion;
    this.pedidoActivoToken = localStorage.getItem('pedido_activo_token');

    this.menuService.getCategorias().subscribe({
      next: (respuesta) => {
        this.categorias = respuesta;
        if (respuesta.length > 0) {
          localStorage.setItem('restaurante_id', respuesta[0].restaurante);
          this.menuService.getRestaurante(respuesta[0].restaurante).subscribe({
            next: (data) => {
              this.tiendaAbierta = data.abierto;
              this.whatsappRestaurante = data.whatsapp_numero ?? '';
              this.cdr.detectChanges();
            }
          });
        }
        this.aplicarFiltros();
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });

    this.menuService.getAdiciones().subscribe({
      next: (data) => {
        this.adiciones = data;
        this.cdr.detectChanges();
      }
    });
  }

  setFiltro(id: string | null) {
    this.filtroActivo = id;
    this.aplicarFiltros();
  }

  onBuscar() {
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    let resultado = this.categorias;

    if (this.filtroActivo) {
      resultado = resultado.filter(c => c.id === this.filtroActivo);
    }

    if (this.busqueda.trim()) {
      const termino = this.busqueda.trim().toLowerCase();
      resultado = resultado
        .map(c => ({
          ...c,
          productos: c.productos?.filter(p => p.nombre.toLowerCase().includes(termino))
        }))
        .filter(c => c.productos && c.productos.length > 0);
    }

    this.categoriasVisibles = resultado;
  }

  formatPrecio(precio: number | string): string {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Number(precio));
  }

  agregar(producto: Producto) {
    this.carrito.agregar(producto);
  }

  quitar(producto: Producto) {
    this.carrito.quitar(producto.id);
  }

  irAlCarrito() {
    this.router.navigate(['/tienda/carrito']);
  }

  irASeguimientoActivo() {
    if (this.pedidoActivoToken) {
      this.router.navigate(['/tienda/seguimiento', this.pedidoActivoToken]);
    }
  }

  get whatsappUrl(): string {
    const digitos = this.whatsappRestaurante.replace(/\D/g, '');
    const numero = digitos.length === 10 ? '57' + digitos : digitos;
    return `https://wa.me/${numero}`;
  }

  toggleEditarDireccion() {
    this.editandoDireccion = !this.editandoDireccion;
    this.direccionEditada = this.direccionCliente;
  }

  guardarDireccion() {
    if (!this.direccionEditada.trim()) return;

    const cliente = this.clienteService.obtenerLocal();
    if (!cliente) return;

    const actualizado = { ...cliente, direccion: this.direccionEditada };

    this.clienteService.actualizar(cliente.telefono, actualizado).subscribe({
      next: () => {
        this.clienteService.guardarLocal(actualizado);
        this.direccionCliente = this.direccionEditada;
        this.editandoDireccion = false;
        this.cdr.detectChanges();
      }
    });
  }

  abrirDetalle(producto: Producto) {
    this.productoDetalle = producto;
    this.cantidadDetalle = 1;
    this.adicionesDetalle = [];
  }

  cerrarDetalle() {
    this.productoDetalle = null;
  }

  cambiarCantidad(delta: number) {
    this.cantidadDetalle = Math.max(1, this.cantidadDetalle + delta);
  }

  tieneAdicionDetalle(id: string): boolean {
    return this.adicionesDetalle.some(a => a.id === id);
  }

  toggleAdicionDetalle(adicion: Adicion) {
    if (this.tieneAdicionDetalle(adicion.id)) {
      this.adicionesDetalle = this.adicionesDetalle.filter(a => a.id !== adicion.id);
    } else {
      this.adicionesDetalle = [...this.adicionesDetalle, adicion];
    }
  }

  get totalDetalle(): number {
    if (!this.productoDetalle) return 0;
    const extra = this.adicionesDetalle.reduce((s, a) => s + Number(a.precio), 0);
    return (Number(this.productoDetalle.precio) + extra) * this.cantidadDetalle;
  }

  agregarDesdeDetalle() {
    if (!this.productoDetalle || !this.tiendaAbierta) return;
    this.carrito.agregarConDetalle(this.productoDetalle, this.cantidadDetalle, this.adicionesDetalle);
    this.cerrarDetalle();
  }
}
