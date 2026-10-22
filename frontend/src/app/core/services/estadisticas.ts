import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TotalesTipo {
  pedidos: number;
  ventas: number;
}

export interface ResumenVentas {
  desde: string;
  hasta: string;
  ventas_total: number;
  pedidos_entregados: number;
  ticket_promedio: number;
  por_tipo: {
    domicilio: TotalesTipo;
    local: TotalesTipo;
  };
}

export interface ProductoVendido {
  nombre: string;
  unidades: number;
}

export interface HoraPedidos {
  hora: number;
  pedidos: number;
}

export interface DetalleEstadisticas {
  desde: string;
  hasta: string;
  mas_vendidos: ProductoVendido[];
  menos_vendidos: ProductoVendido[];
  horas: HoraPedidos[];
}

export interface MetodoPago {
  metodo: string;
  nombre: string;
  pedidos: number;
  ventas: number;
  porcentaje: number;
}

export interface ResumenRechazados {
  recibidos: number;
  rechazados: number;
  porcentaje: number;
}

export interface VentasMesera {
  nombre: string;
  pedidos: number;
  ventas: number;
}

export interface ClienteTop {
  nombre: string;
  pedidos: number;
  ventas: number;
}

export interface ResumenClientes {
  atendidos: number;
  nuevos: number;
  repiten: number;
  top: ClienteTop[];
}

export interface PagosClientes {
  desde: string;
  hasta: string;
  metodos_pago: MetodoPago[];
  rechazados: ResumenRechazados;
  meseras: VentasMesera[];
  clientes: ResumenClientes;
}

@Injectable({
  providedIn: 'root'
})
export class EstadisticasService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getResumen(desde: string, hasta: string): Observable<ResumenVentas> {
    return this.http.get<ResumenVentas>(`${this.apiUrl}/estadisticas/resumen/`, {
      params: { desde, hasta }
    });
  }

  getDetalle(desde: string, hasta: string): Observable<DetalleEstadisticas> {
    return this.http.get<DetalleEstadisticas>(`${this.apiUrl}/estadisticas/detalle/`, {
      params: { desde, hasta }
    });
  }

  getPagosClientes(desde: string, hasta: string): Observable<PagosClientes> {
    return this.http.get<PagosClientes>(`${this.apiUrl}/estadisticas/pagos-y-clientes/`, {
      params: { desde, hasta }
    });
  }
}
