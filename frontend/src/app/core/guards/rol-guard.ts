import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const rolGuard: CanActivateFn = (route) => {
  const auth = inject(Auth);
  const router = inject(Router);

  const rol = auth.rol();
  if (!auth.isAuthenticated() || !rol) {
    auth.logout();
    router.navigate(['/login']);
    return false;
  }

  const permitidos: string[] = route.data['roles'] ?? [];
  if (permitidos.includes(rol)) {
    return true;
  }

  router.navigate([auth.rutaInicio()]);
  return false;
};
