import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { UserRole } from '../../models/role.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css'
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected email = 'mina@example.com';
  protected password = 'user123';
  protected message = '';

  submit(): void {
    const result = this.auth.login(this.email, this.password);
    if (!result.ok) {
      this.message = result.message;
      return;
    }

    this.message = '';
    this.router.navigate(['/dashboard', result.role]);
  }

  protected readonly UserRole = UserRole;
}