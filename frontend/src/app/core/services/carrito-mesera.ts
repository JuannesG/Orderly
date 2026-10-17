import { Injectable } from '@angular/core';
import { Producto, Adicion } from './menu';

export interface LineaMesera {
  id: number;
  producto: Producto;
  cantidad: number;
  adicionales: Adicion[];
}

@Injectable({
  providedIn: 'root',
})
export class CarritoMesera {
  private siguienteId = 1;
  private lineas: LineaMesera[] = [];

  get lineasActuales(): LineaMesera[] {
    return this.lineas;
  }

  private clave(adicionales: Adicion[]): string {
    return adicionales.map((a) => a.id).sort().join(',');
  }

  agregar(producto: Producto, cantidad: number, adicionales: Adicion[]) {
    const clave = this.clave(adicionales);
    const existente = this.lineas.find(
      (l) => l.producto.id === producto.id && this.clave(l.adicionales) === clave
    );

    if (existente) {
      existente.cantidad += cantidad;
    } else {
      this.lineas = [
        ...this.lineas,
        { id: this.siguienteId++, producto, cantidad, adicionales: [...adicionales] },
      ];
    }
  }

  cambiarCantidad(id: number, delta: number) {
    this.lineas = this.lineas
      .map((l) => (l.id === id ? { ...l, cantidad: l.cantidad + delta } : l))
      .filter((l) => l.cantidad > 0);
  }

  precioLinea(linea: LineaMesera): number {
    const extra = linea.adicionales.reduce((suma, a) => suma + Number(a.precio), 0);
    return (Number(linea.producto.precio) + extra) * linea.cantidad;
  }

  subtotal(): number {
    return this.lineas.reduce((suma, l) => suma + this.precioLinea(l), 0);
  }

  vaciar() {
    this.lineas = [];
  }
}
