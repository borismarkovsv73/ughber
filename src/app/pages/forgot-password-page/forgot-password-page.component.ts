import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forgot-password-page.component.html',
  styleUrl: './forgot-password-page.component.css'
})
export class ForgotPasswordPageComponent {
  private readonly auth = inject(AuthService);

  protected email = '';
  protected message = '';
  protected resetUrl = '';

  submit(): void {
    const result = this.auth.requestPasswordReset(this.email);
    if (!result.ok) {
      this.message = result.message;
      this.resetUrl = '';
      return;
    }

    this.message = 'Poslat je email za reset lozinke (demo link ispod).';
    this.resetUrl = result.resetUrl;
  }
}