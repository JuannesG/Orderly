import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Cliente {
  id?: string;
  telefono: string;
  nombre: string;
  direccion: string;
  referencia?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  buscarPorTelefono(telefono: string): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.apiUrl}/clientes/${telefono}/`);
  }

  crear(cliente: Cliente): Observable<Cliente> {
    return this.http.post<Cliente>(`${this.apiUrl}/clientes/`, cliente);
  }

  actualizar(telefono: string, cliente: Cliente): Observable<Cliente> {
    return this.http.put<Cliente>(`${this.apiUrl}/clientes/${telefono}/`, cliente);
  }

  guardarLocal(cliente: Cliente) {
    localStorage.setItem('cliente_datos', JSON.stringify(cliente));
  }

  obtenerLocal(): Cliente | null {
    const datos = localStorage.getItem('cliente_datos');
    return datos ? JSON.parse(datos) : null;
  }
}
