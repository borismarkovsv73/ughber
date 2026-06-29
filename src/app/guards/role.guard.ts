import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { UserRole } from '../models/role.model';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const currentUser = auth.currentUser();
  const requestedRole = route.paramMap.get('role') as UserRole | null;

  if (!currentUser || !requestedRole) {
    return router.createUrlTree(['/login']);
  }

  if (currentUser.role === UserRole.Admin || currentUser.role === requestedRole) {
    return true;
  }

  return router.createUrlTree(['/dashboard', currentUser.role]);
};
