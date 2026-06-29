import { Routes } from '@angular/router';

import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { ActivateAccountPageComponent } from './pages/activate-account-page/activate-account-page.component';
import { AdminDriverRegistrationPageComponent } from './pages/admin-driver-registration-page/admin-driver-registration-page.component';
import { AdminRideHistoryPageComponent } from './pages/admin-ride-history-page/admin-ride-history-page.component';
import { DashboardPageComponent } from './pages/dashboard-page/dashboard-page.component';
import { ForgotPasswordPageComponent } from './pages/forgot-password-page/forgot-password-page.component';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { LoginPageComponent } from './pages/login-page/login-page.component';
import { RegisterPageComponent } from './pages/register-page/register-page.component';
import { ResetPasswordPageComponent } from './pages/reset-password-page/reset-password-page.component';

export const routes: Routes = [
  {
    path: '',
    component: HomePageComponent
  },
  {
    path: 'login',
    component: LoginPageComponent
  },
  {
    path: 'register',
    component: RegisterPageComponent
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordPageComponent
  },
  {
    path: 'reset-password',
    component: ResetPasswordPageComponent
  },
  {
    path: 'activate',
    component: ActivateAccountPageComponent
  },
  {
    path: 'admin/driver-registration',
    component: AdminDriverRegistrationPageComponent,
    canActivate: [authGuard]
  },
  {
    path: 'admin/ride-history',
    component: AdminRideHistoryPageComponent,
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/:role',
    component: DashboardPageComponent,
    canActivate: [authGuard, roleGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
