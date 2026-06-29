import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password-page.component.html',
  styleUrl: './reset-password-page.component.css'
})
export class ResetPasswordPageComponent {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected password = '';
  protected confirmPassword = '';
  protected message = '';
  protected readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';

  submit(): void {
    if (!this.token) {
      this.message = 'Nedostaje token za reset lozinke.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.message = 'Lozinke se ne poklapaju.';
      return;
    }

    const result = this.auth.resetPassword(this.token, this.password);
    if (!result.ok) {
      this.message = result.message;
      return;
    }

    this.router.navigate(['/login']);
  }
}