import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface TokenResponse {
  access: string;
  refresh: string;
  rol: string;
  nombre: string;
}

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.apiUrl}/token/`, { username, password }).pipe(
      tap((respuesta) => {
        localStorage.setItem('access_token', respuesta.access);
        localStorage.setItem('refresh_token', respuesta.refresh);
        localStorage.setItem('rol', respuesta.rol);
        localStorage.setItem('nombre', respuesta.nombre);
      }),
    );
  }

  refreshToken(): Observable<any> {
    const refresh = localStorage.getItem('refresh_token');
    return this.http
      .post<any>(`${this.apiUrl}/token/refresh/`, { refresh })
      .pipe(tap((resp) => localStorage.setItem('access_token', resp.access)));
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('rol');
    localStorage.removeItem('nombre');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  rol(): string | null {
    return localStorage.getItem('rol');
  }

  nombre(): string {
    return localStorage.getItem('nombre') ?? '';
  }

  rutaInicio(): string {
    switch (this.rol()) {
      case 'dueño':
        return '/dashboard';
      case 'domicilios':
        return '/pedidos';
      case 'mesero':
        return '/mesero';
      default:
        return '/login';
    }
  }
}
