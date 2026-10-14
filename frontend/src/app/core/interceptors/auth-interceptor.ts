import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { Auth } from '../services/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const token = localStorage.getItem('access_token');

  const reqConToken = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(reqConToken).pipe(
    catchError((error: HttpErrorResponse) => {
      const esLoginOToken = req.url.includes('/token/');
      if (error.status === 401 && !esLoginOToken && localStorage.getItem('refresh_token')) {
        return auth.refreshToken().pipe(
          switchMap(() => {
            const nuevoToken = localStorage.getItem('access_token');
            const reqReintentada = req.clone({ setHeaders: { Authorization: `Bearer ${nuevoToken}` } });
            return next(reqReintentada);
          }),
          catchError(() => {
            auth.logout();
            window.location.href = '/login';
            return throwError(() => error);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
