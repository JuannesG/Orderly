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
}
