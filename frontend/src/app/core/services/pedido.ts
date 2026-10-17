import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DetallePedidoPayload {
  producto: string;
  cantidad: number;
  precio_unitario: number;
  adiciones: string[];
}

export interface PedidoPayload {
  cliente: string;
  restaurante: string;
  subtotal: number;
  costo_domicilio: number;
  total: number;
  observaciones: string;
  detalles: DetallePedidoPayload[];
  metodo_pago: string;
  comprobante_url?: string;
}

export interface PedidoCreado {
  id: string;
  token_seguimiento: string;
  estado: string;
}

export interface PedidoLocalPayload {
  zona: string;
  mesa: string;
  nota: string;
  metodo_pago_local: string;
  observaciones: string;
  detalles: { producto: string; cantidad: number; adiciones: string[] }[];
}

@Injectable({
  providedIn: 'root',
})
export class Pedido {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  crear(payload: PedidoPayload): Observable<PedidoCreado> {
    return this.http.post<PedidoCreado>(`${this.apiUrl}/pedidos/`, payload);
  }

  crearLocal(payload: PedidoLocalPayload): Observable<any> {
    return this.http.post(`${this.apiUrl}/pedidos/local/`, payload);
  }

  listarLocal(filtro: string, mios: boolean): Observable<any[]> {
    const extra = mios ? '&mios=1' : '';
    return this.http.get<any[]>(`${this.apiUrl}/pedidos/en-local/?filtro=${filtro}${extra}`);
  }

  imprimir(token: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/pedidos/${token}/imprimir/`, {});
  }

  marcarEntregado(token: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/pedidos/${token}/entregado/`, {});
  }

  obtenerPorToken(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/pedidos/${token}/`);
  }

  listar(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/pedidos/`);
  }

  subirComprobante(token: string, archivo: File): Observable<any> {
    const form = new FormData();
    form.append('comprobante', archivo);
    return this.http.post(`${this.apiUrl}/pedidos/${token}/comprobante/`, form);
  }

  cambiarEstado(id: string, estado: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/pedidos/${id}/`, { estado });
  }

  verificarPago(pagoId: string, estadoVerificacion: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/pagos/${pagoId}/`, {
      estado_verificacion: estadoVerificacion,
    });
  }

  misPedidos(telefono: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/pedidos/mios/?telefono=${telefono}`);
  }
}
