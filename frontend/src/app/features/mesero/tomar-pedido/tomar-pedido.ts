import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Menu, Categoria, Producto, Adicion } from '../../../core/services/menu';
import { CarritoMesera, LineaMesera } from '../../../core/services/carrito-mesera';
import { Pedido, PedidoLocalPayload } from '../../../core/services/pedido';

type Zona = 'salon' | 'terraza' | 'para_llevar';
type MetodoPago = 'efectivo' | 'nequi' | 'bancolombia';

// Las categorías cuyo nombre contenga alguno de estos textos no ofrecen adicionales.
const CATEGORIAS_SIN_ADICIONALES = ['bebida'];

@Component({
  selector: 'app-tomar-pedido',
  imports: [FormsModule],
  templateUrl: './tomar-pedido.html',
  styleUrl: './tomar-pedido.css'
})
export class TomarPedido implements OnInit {
  // Paso 1 y 2: dónde es el pedido
  zona: Zona | null = null;
  mesa = '';
  nota = '';

  readonly mesasSalon = Array.from({ length: 17 }, (_, i) => String(i + 1));
  readonly mesasTerraza = Array.from({ length: 11 }, (_, i) => `A${i + 1}`);

  // Paso 3: menú
  categorias: Categoria[] = [];
  categoriasVisibles: Categoria[] = [];
  adiciones: Adicion[] = [];
  filtroActivo: string | null = null;
  busqueda = '';
  cargandoMenu = true;
  errorMenu = '';

  // Ventana de detalle del producto
  productoDetalle: Producto | null = null;
  permiteAdicionales = true;
  cantidadDetalle = 1;
  adicionesDetalle: Adicion[] = [];

  // Paso 4 y 5: resumen, pago y envío
  observaciones = '';
  metodoPago: MetodoPago | null = null;
  enviando = false;
  error = '';
  pedidoEnviado: { destino: string; total: number } | null = null;

  readonly metodosPago: { valor: MetodoPago; texto: string }[] = [
    { valor: 'efectivo', texto: '💵 Efectivo' },
    { valor: 'nequi', texto: '📱 Nequi' },
    { valor: 'bancolombia', texto: '🏦 Bancolombia' },
  ];

  constructor(
    private menuService: Menu,
    public carrito: CarritoMesera,
    private pedidoService: Pedido,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Cada vez que se abre la pantalla se empieza un pedido limpio.
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

  // ---------- Zona y mesa ----------

  get mesas(): string[] {
    if (this.zona === 'salon') return this.mesasSalon;
    if (this.zona === 'terraza') return this.mesasTerraza;
    return [];
  }

  elegirZona(zona: Zona) {
    this.zona = zona;
    this.mesa = '';
    this.nota = '';
  }

  elegirMesa(mesa: string) {
    this.mesa = mesa;
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

  nombresAdicionales(linea: LineaMesera): string {
    return linea.adicionales.map((a) => a.nombre).join(', ');
  }

  elegirPago(metodo: MetodoPago) {
    this.metodoPago = metodo;
  }

  get puedeEnviar(): boolean {
    return (
      this.listoParaPedir &&
      this.carrito.lineasActuales.length > 0 &&
      this.metodoPago !== null &&
      !this.enviando
    );
  }

  enviar() {
    if (!this.puedeEnviar || !this.zona || !this.metodoPago) return;

    this.enviando = true;
    this.error = '';

    const payload: PedidoLocalPayload = {
      zona: this.zona,
      mesa: this.zona === 'para_llevar' ? '' : this.mesa,
      nota: this.zona === 'para_llevar' ? this.nota.trim() : '',
      metodo_pago_local: this.metodoPago,
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
    return 'No se pudo enviar el pedido. Revisa la conexión e intenta de nuevo.';
  }

  nuevoPedido() {
    this.zona = null;
    this.mesa = '';
    this.nota = '';
    this.observaciones = '';
    this.metodoPago = null;
    this.error = '';
    this.busqueda = '';
    this.filtroActivo = null;
    this.aplicarFiltros();
    this.carrito.vaciar();
    this.pedidoEnviado = null;
  }
}
