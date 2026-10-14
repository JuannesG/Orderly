import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Producto, Adicion } from './menu';

export interface ItemCarrito {
  producto: Producto;
  cantidad: number;
  adicionales: Adicion[];
}

@Injectable({
  providedIn: 'root',
})
export class Carrito {
  private items = new BehaviorSubject<ItemCarrito[]>(this.cargarDeStorage());
  items$ = this.items.asObservable();

  private cargarDeStorage(): ItemCarrito[] {
    const guardado = localStorage.getItem('carrito');
    return guardado ? JSON.parse(guardado) : [];
  }

  private guardarEnStorage(items: ItemCarrito[]) {
    localStorage.setItem('carrito', JSON.stringify(items));
  }

  obtenerCantidad(productoId: string | undefined): number {
    const item = this.items.value.find((i) => i.producto.id === productoId);
    return item ? item.cantidad : 0;
  }

  agregar(producto: Producto) {
    const actuales = [...this.items.value];
    const existente = actuales.find((i) => i.producto.id === producto.id);

    if (existente) {
      existente.cantidad++;
    } else {
      actuales.push({ producto, cantidad: 1, adicionales: [] });
    }

    this.items.next(actuales);
    this.guardarEnStorage(actuales);
  }

  agregarConDetalle(producto: Producto, cantidad: number, adicionales: Adicion[]) {
    const actuales = [...this.items.value];
    const existente = actuales.find((i) => i.producto.id === producto.id);

    if (existente) {
      existente.cantidad += cantidad;
      for (const a of adicionales) {
        if (!existente.adicionales.some((x) => x.id === a.id)) {
          existente.adicionales = [...existente.adicionales, a];
        }
      }
    } else {
      actuales.push({ producto, cantidad, adicionales: [...adicionales] });
    }

    this.items.next(actuales);
    this.guardarEnStorage(actuales);
  }

  quitar(productoId: string | undefined) {
    let actuales = [...this.items.value];
    const existente = actuales.find((i) => i.producto.id === productoId);

    if (existente) {
      existente.cantidad--;
      if (existente.cantidad <= 0) {
        actuales = actuales.filter((i) => i.producto.id !== productoId);
      }
    }

    this.items.next(actuales);
    this.guardarEnStorage(actuales);
  }

  toggleAdicional(productoId: string | undefined, adicional: Adicion) {
    const actuales = [...this.items.value];
    const item = actuales.find((i) => i.producto.id === productoId);
    if (!item) return;

    const yaEsta = item.adicionales.some((a) => a.id === adicional.id);
    if (yaEsta) {
      item.adicionales = item.adicionales.filter((a) => a.id !== adicional.id);
    } else {
      item.adicionales = [...item.adicionales, adicional];
    }

    this.items.next(actuales);
    this.guardarEnStorage(actuales);
  }

  tieneAdicional(item: ItemCarrito, adicionId: string): boolean {
    return item.adicionales.some((a) => a.id === adicionId);
  }

  precioItem(item: ItemCarrito): number {
    const precioAdicionales = item.adicionales.reduce((sum, a) => sum + Number(a.precio), 0);
    return (Number(item.producto.precio) + precioAdicionales) * item.cantidad;
  }

  totalItems(): number {
    return this.items.value.reduce((sum, i) => sum + i.cantidad, 0);
  }

  subtotal(): number {
    return this.items.value.reduce((sum, item) => sum + this.precioItem(item), 0);
  }

  vaciar() {
    this.items.next([]);
    localStorage.removeItem('carrito');
  }
}
