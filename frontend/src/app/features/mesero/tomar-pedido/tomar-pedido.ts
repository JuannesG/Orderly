import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideUtensils,
  LucideLeaf,
  LucideShoppingBag,
  LucideCheck,
  LucidePencil,
  LucideSearch,
  LucidePlus,
  LucideMinus,
  LucideShoppingCart,
  LucideChevronRight,
  LucideArrowLeft,
  LucideX,
  LucideCircleCheck
} from '@lucide/angular';
import { Menu, Categoria, Producto, Adicion } from '../../../core/services/menu';
import { CarritoMesera, LineaMesera } from '../../../core/services/carrito-mesera';
import { Pedido, PedidoLocalPayload } from '../../../core/services/pedido';

type Zona = 'salon' | 'terraza' | 'para_llevar';
type Vista = 'menu' | 'resumen';

const CATEGORIAS_SIN_ADICIONALES = ['bebida'];

@Component({
  selector: 'app-tomar-pedido',
  imports: [
    FormsModule,
    LucideUtensils,
    LucideLeaf,
    LucideShoppingBag,
    LucideCheck,
    LucidePencil,
    LucideSearch,
    LucidePlus,
    LucideMinus,
    LucideShoppingCart,
    LucideChevronRight,
    LucideArrowLeft,
    LucideX,
    LucideCircleCheck
  ],
  templateUrl: './tomar-pedido.html',
  styleUrl: './tomar-pedido.css'
})
export class TomarPedido implements OnInit {
  // Ubicación
  zona: Zona | null = null;
  mesa = '';
  nota = '';
  ubicacionConfirmada = false;

  readonly mesasSalon = Array.from({ length: 17 }, (_, i) => String(i + 1));
  readonly mesasTerraza = Array.from({ length: 11 }, (_, i) => `A${i + 1}`);

  // Menú
  categorias: Categoria[] = [];
  categoriasVisibles: Categoria[] = [];
  adiciones: Adicion[] = [];
  filtroActivo: string | null = null;
  busqueda = '';
  cargandoMenu = true;
  errorMenu = '';

  // Ventana de detalle
  productoDetalle: Producto | null = null;
  permiteAdicionales = true;
  cantidadDetalle = 1;
  adicionesDetalle: Adicion[] = [];

  // Resumen y envío
  vista: Vista = 'menu';
  observaciones = '';
  enviando = false;
  error = '';
  pedidoEnviado: { destino: string; total: number } | null = null;

  constructor(
    private menuService: Menu,
    public carrito: CarritoMesera,
    private pedidoService: Pedido,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.carrito.vaciar();

    this.menuService.getCategorias().subscribe({
      next: (respuesta) => {
        this.categorias = respuesta;
        this.aplicarFiltros();
        this.cargandoMenu = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMenu = 'No se pudo cargar el menú. Recarga la página.';
        this.cargandoMenu = false;
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

  // ---------- Ubicación ----------

  get mesas(): string[] {
    if (this.zona === 'salon') return this.mesasSalon;
    if (this.zona === 'terraza') return this.mesasTerraza;
    return [];
  }

  elegirZona(zona: Zona) {
    if (zona === this.zona) return;
    this.zona = zona;
    this.mesa = '';
    this.nota = '';
    this.ubicacionConfirmada = false;
  }

  // Al tocar una mesa, el paso se da por completado y se recoge.
  elegirMesa(mesa: string) {
    this.mesa = mesa;
    this.ubicacionConfirmada = true;
  }

  confirmarParaLlevar() {
    if (this.nota.trim().length === 0) return;
    this.ubicacionConfirmada = true;
  }

  editarUbicacion() {
    this.ubicacionConfirmada = false;
  }

  get listoParaPedir(): boolean {
    if (this.zona === 'para_llevar') return this.nota.trim().length > 0;
    return this.zona !== null && this.mesa !== '';
  }

  get destino(): string {
    if (this.zona === 'salon') return `Salón · Mesa ${this.mesa}`;
    if (this.zona === 'terraza') return `Terraza · Mesa ${this.mesa}`;
    return `Para llevar · ${this.nota.trim()}`;
  }

  // ---------- Menú ----------

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
      resultado = resultado.filter((c) => c.id === this.filtroActivo);
    }

    if (this.busqueda.trim()) {
      const termino = this.busqueda.trim().toLowerCase();
      resultado = resultado
        .map((c) => ({
          ...c,
          productos: c.productos?.filter((p) => p.nombre.toLowerCase().includes(termino))
        }))
        .filter((c) => c.productos && c.productos.length > 0);
    }

    this.categoriasVisibles = resultado;
  }

  formatPrecio(precio: number | string): string {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Number(precio));
  }

  // Toque rápido: una unidad sin adicionales.
  agregarRapido(producto: Producto) {
    if (!producto.disponible) return;
    this.carrito.agregar(producto, 1, []);
  }

  cantidadEnPedido(producto: Producto): number {
    return this.carrito.lineasActuales
      .filter((l) => l.producto.id === producto.id)
      .reduce((suma, l) => suma + l.cantidad, 0);
  }

  get unidadesEnPedido(): number {
    return this.carrito.lineasActuales.reduce((suma, l) => suma + l.cantidad, 0);
  }

  // ---------- Ventana de detalle ----------

  abrirDetalle(producto: Producto, categoria: Categoria) {
    if (!producto.disponible) return;
    this.productoDetalle = producto;
    this.permiteAdicionales = this.categoriaPermiteAdicionales(categoria);
    this.cantidadDetalle = 1;
    this.adicionesDetalle = [];
  }

  cerrarDetalle() {
    this.productoDetalle = null;
  }

  private categoriaPermiteAdicionales(categoria: Categoria): boolean {
    const nombre = categoria.nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return !CATEGORIAS_SIN_ADICIONALES.some((texto) => nombre.includes(texto));
  }

  cambiarCantidadDetalle(delta: number) {
    this.cantidadDetalle = Math.max(1, this.cantidadDetalle + delta);
  }

  tieneAdicionDetalle(id: string): boolean {
    return this.adicionesDetalle.some((a) => a.id === id);
  }

  toggleAdicionDetalle(adicion: Adicion) {
    if (this.tieneAdicionDetalle(adicion.id)) {
      this.adicionesDetalle = this.adicionesDetalle.filter((a) => a.id !== adicion.id);
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
    if (!this.productoDetalle) return;
    this.carrito.agregar(this.productoDetalle, this.cantidadDetalle, this.adicionesDetalle);
    this.cerrarDetalle();
  }

  // ---------- Resumen y envío ----------

  verPedido() {
    if (this.unidadesEnPedido === 0) return;
    this.error = '';
    this.vista = 'resumen';
  }

  volverAlMenu() {
    this.vista = 'menu';
  }

  nombresAdicionales(linea: LineaMesera): string {
    return linea.adicionales.map((a) => a.nombre).join(', ');
  }

  nombreCategoria(producto: Producto): string {
    const categoria = this.categorias.find((c) => c.productos?.some((p) => p.id === producto.id));
    return categoria?.nombre ?? '';
  }

  get puedeEnviar(): boolean {
    return this.listoParaPedir && this.carrito.lineasActuales.length > 0 && !this.enviando;
  }

  enviar() {
    if (!this.puedeEnviar || !this.zona) return;

    this.enviando = true;
    this.error = '';

    const payload: PedidoLocalPayload = {
      zona: this.zona,
      mesa: this.zona === 'para_llevar' ? '' : this.mesa,
      nota: this.zona === 'para_llevar' ? this.nota.trim() : '',
      observaciones: this.observaciones.trim(),
      detalles: this.carrito.lineasActuales.map((l) => ({
        producto: String(l.producto.id),
        cantidad: l.cantidad,
        adiciones: l.adicionales.map((a) => a.id),
      })),
    };

    const destino = this.destino;

    this.pedidoService.crearLocal(payload).subscribe({
      next: (respuesta) => {
        this.pedidoEnviado = { destino, total: Number(respuesta.total) };
        this.carrito.vaciar();
        this.enviando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = this.mensajeError(err);
        this.enviando = false;
        this.cdr.detectChanges();
      }
    });
  }

  private mensajeError(err: any): string {
    const cuerpo = err?.error;
    if (cuerpo && typeof cuerpo === 'object') {
      if (typeof cuerpo.detail === 'string') return cuerpo.detail;
      const primero: any = Object.values(cuerpo)[0];
      if (Array.isArray(primero) && typeof primero[0] === 'string') return primero[0];
    }
    if (err?.status === 0) {
      return 'No hay conexión con el servidor. Revisa el internet e intenta de nuevo.';
    }
    if (err?.status >= 500) {
      return 'El servidor tuvo un problema. Avísale al administrador.';
    }
    return 'No se pudo enviar el pedido. Revisa la conexión e intenta de nuevo.';
  }

  nuevoPedido() {
    this.zona = null;
    this.mesa = '';
    this.nota = '';
    this.ubicacionConfirmada = false;
    this.vista = 'menu';
    this.observaciones = '';
    this.error = '';
    this.busqueda = '';
    this.filtroActivo = null;
    this.aplicarFiltros();
    this.carrito.vaciar();
    this.pedidoEnviado = null;
  }
}
