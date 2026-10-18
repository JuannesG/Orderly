import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Carrito } from '../../../core/services/carrito';
import { ClienteService } from '../../../core/services/cliente';
import { Pedido as PedidoService, PedidoPayload } from '../../../core/services/pedido';
import { Menu } from '../../../core/services/menu';

const COSTO_DOMICILIO = 3000;
const BILLETES = [20000, 50000, 100000];

@Component({
  selector: 'app-checkout',
  imports: [CommonModule, FormsModule],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout implements OnInit {
  observaciones = '';
  metodoPago: 'nequi' | 'bancolombia' | 'efectivo' | '' = '';
  archivoComprobante: File | null = null;
  nombreArchivo = '';
  enviando = false;
  copiado = false;
  tiendaAbierta = true;
  cuentaNequi = '';
  cuentaBancolombia = '';
  costoDomicilio = COSTO_DOMICILIO;
  billetes = BILLETES;
  efectivoOpcion: 'exacto' | 'otro' | number | null = null;
  otroValor = '';

  constructor(
    public carrito: Carrito,
    private clienteService: ClienteService,
    private pedidoService: PedidoService,
    private menuService: Menu,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    if (this.carrito.totalItems() === 0) {
      this.router.navigate(['/tienda/menu']);
      return;
    }

    const restauranteId = localStorage.getItem('restaurante_id');
    if (restauranteId) {
      this.menuService.getRestaurante(restauranteId).subscribe({
        next: (data) => {
          this.tiendaAbierta = data.abierto;
          this.cuentaNequi = data.cuenta_nequi ?? '';
          this.cuentaBancolombia = data.cuenta_bancolombia ?? '';
          if (!this.tiendaAbierta) {
            alert('El restaurante está cerrado en este momento. No se pueden confirmar pedidos.');
            this.router.navigate(['/tienda/menu']);
          }
          this.cdr.detectChanges();
        },
      });
    }
  }

  formatPrecio(precio: number): string {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(precio);
  }

  get total(): number {
    return this.carrito.subtotal() + this.costoDomicilio;
  }

  get cuentaActual(): string {
    return this.metodoPago === 'nequi' ? this.cuentaNequi : this.cuentaBancolombia;
  }

  // Con cuánto paga el cliente. null significa "pago exacto" o aún sin elegir.
  get pagaCon(): number | null {
    if (this.efectivoOpcion === 'otro') {
      const valor = Number(this.otroValor.replace(/\D/g, ''));
      return valor > 0 ? valor : null;
    }
    if (typeof this.efectivoOpcion === 'number') return this.efectivoOpcion;
    return null;
  }

  get efectivoValido(): boolean {
    if (this.efectivoOpcion === 'exacto') return true;
    const valor = this.pagaCon;
    return valor !== null && valor >= this.total;
  }

  get cambio(): number {
    return this.pagaCon !== null ? this.pagaCon - this.total : 0;
  }

  elegirExacto() {
    this.efectivoOpcion = 'exacto';
    this.otroValor = '';
  }

  elegirBillete(valor: number) {
    this.efectivoOpcion = valor;
    this.otroValor = '';
  }

  onOtroValor(texto: string) {
    this.otroValor = texto;
    this.efectivoOpcion = 'otro';
  }

  copiarCuenta() {
    navigator.clipboard.writeText(this.cuentaActual);
    this.copiado = true;
    setTimeout(() => {
      this.copiado = false;
      this.cdr.detectChanges();
    }, 2000);
  }

  onArchivo(event: Event) {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;

    if (!archivo.type.startsWith('image/')) {
      alert('Selecciona una imagen.');
      return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
      alert('La imagen supera 5 MB.');
      return;
    }

    this.archivoComprobante = archivo;
    this.nombreArchivo = archivo.name;
  }

  confirmarPedido() {
    if (!this.metodoPago) {
      alert('Selecciona un método de pago');
      return;
    }

    if (this.metodoPago !== 'efectivo' && !this.archivoComprobante) {
      alert('Sube la foto de tu comprobante de pago');
      return;
    }

    if (this.metodoPago === 'efectivo' && !this.efectivoValido) {
      alert('Elige con qué billete vas a pagar, o toca "Pago exacto".');
      return;
    }

    const cliente = this.clienteService.obtenerLocal();
    const restauranteId = localStorage.getItem('restaurante_id');

    if (!cliente || !cliente.id || !restauranteId) {
      alert('Faltan datos del cliente o restaurante. Vuelve a intentarlo.');
      return;
    }

    let itemsArray: any[] = [];
    this.carrito.items$.subscribe((v) => (itemsArray = v)).unsubscribe();

    const payload: PedidoPayload = {
      cliente: cliente.id,
      restaurante: restauranteId,
      subtotal: this.carrito.subtotal(),
      costo_domicilio: this.costoDomicilio,
      total: this.total,
      observaciones: this.observaciones,
      detalles: itemsArray.map((item) => ({
        producto: item.producto.id,
        cantidad: item.cantidad,
        precio_unitario: Number(item.producto.precio),
        adiciones: item.adicionales.map((a: any) => a.id),
      })),
      metodo_pago: this.metodoPago,
      paga_con: this.metodoPago === 'efectivo' ? this.pagaCon : null,
    };

    this.enviando = true;

    this.pedidoService.crear(payload).subscribe({
      next: (resp) => {
        if (this.metodoPago !== 'efectivo' && this.archivoComprobante) {
          this.pedidoService
            .subirComprobante(resp.token_seguimiento, this.archivoComprobante)
            .subscribe({
              next: () => this.finalizar(resp.token_seguimiento),
              error: () => {
                alert(
                  'Tu pedido se creó, pero no se pudo subir el comprobante. Envíalo por WhatsApp al restaurante.',
                );
                this.finalizar(resp.token_seguimiento);
              },
            });
        } else {
          this.finalizar(resp.token_seguimiento);
        }
      },
      error: (err) => {
        console.error('Error al crear pedido:', err);
        this.enviando = false;
        this.cdr.detectChanges();
        alert('No se pudo confirmar el pedido. Intenta de nuevo.');
      },
    });
  }

  private finalizar(token: string) {
    this.carrito.vaciar();
    localStorage.setItem('pedido_activo_token', token);
    this.router.navigate(['/tienda/confirmacion', token]);
  }
}
