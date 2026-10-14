import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Producto {
  id?: string;
  categoria: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  disponible: boolean;
  imagen_url?: string;
}

export interface Categoria {
  id?: string;
  restaurante: string;
  nombre: string;
  productos?: Producto[];
}

export interface Adicion {
  id: string;
  nombre: string;
  precio: number;
}

@Injectable({
  providedIn: 'root',
})
export class Menu {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getDashboardResumen(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard/resumen/`);
  }

  getPrimerRestaurante(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/restaurantes/`);
  }

  getCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.apiUrl}/categorias/`);
  }

  getProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.apiUrl}/productos/`);
  }

  getAdiciones(): Observable<Adicion[]> {
    return this.http.get<Adicion[]>(`${this.apiUrl}/adiciones/`);
  }

  crearCategoria(nombre: string): Observable<Categoria> {
    return this.http.post<Categoria>(`${this.apiUrl}/categorias/`, { nombre });
  }

  crearProducto(producto: Producto): Observable<Producto> {
    return this.http.post<Producto>(`${this.apiUrl}/productos/`, producto);
  }

  actualizarProducto(id: string, producto: Producto): Observable<Producto> {
    return this.http.put<Producto>(`${this.apiUrl}/productos/${id}/`, producto);
  }

  eliminarCategoria(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/categorias/${id}/`);
  }

  eliminarProducto(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/productos/${id}/`);
  }

  getRestaurante(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/restaurantes/${id}/`);
  }

  actualizarEstadoRestaurante(id: string, abierto: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/restaurantes/${id}/`, { abierto });
  }
}
