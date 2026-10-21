import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UsuarioEquipo {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  nombre_completo: string;
  rol: string;
  is_active: boolean;
  last_login: string | null;
  es_yo: boolean;
  debe_cambiar_clave: boolean;
}

export interface UsuarioNuevo {
  username: string;
  first_name: string;
  last_name: string;
  rol: string;
  password: string;
}

export interface UsuarioCambios {
  first_name: string;
  last_name: string;
  rol: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  listar(): Observable<UsuarioEquipo[]> {
    return this.http.get<UsuarioEquipo[]>(`${this.apiUrl}/usuarios/`);
  }

  crear(datos: UsuarioNuevo): Observable<UsuarioEquipo> {
    return this.http.post<UsuarioEquipo>(`${this.apiUrl}/usuarios/`, datos);
  }

  editar(id: number, cambios: UsuarioCambios): Observable<UsuarioEquipo> {
    return this.http.patch<UsuarioEquipo>(`${this.apiUrl}/usuarios/${id}/`, cambios);
  }

  desactivar(id: number): Observable<UsuarioEquipo> {
    return this.http.post<UsuarioEquipo>(`${this.apiUrl}/usuarios/${id}/desactivar/`, {});
  }

  reactivar(id: number): Observable<UsuarioEquipo> {
    return this.http.post<UsuarioEquipo>(`${this.apiUrl}/usuarios/${id}/reactivar/`, {});
  }

  cambiarClave(id: number, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/usuarios/${id}/clave/`, { password });
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/usuarios/${id}/`);
  }
}
