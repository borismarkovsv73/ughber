import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.css'
})
export class RegisterPageComponent {
  private readonly auth = inject(AuthService);

  protected email = '';
  protected password = '';
  protected confirmPassword = '';
  protected firstName = '';
  protected lastName = '';
  protected address = '';
  protected phone = '';
  protected avatarUrl = '';
  protected message = '';
  protected messageVariant: 'success' | 'warning' | 'danger' | 'info' = 'info';
  protected activationUrl = '';

  async submit(): Promise<void> {
    this.messageVariant = 'info';
    this.message = 'Registracija je u toku...';

    if (!this.firstName || !this.lastName || !this.email || !this.phone || !this.address || !this.password || !this.confirmPassword) {
      this.messageVariant = 'danger';
      this.message = 'Popuni sva obavezna polja pre registracije.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.messageVariant = 'danger';
      this.message = 'Lozinke se ne poklapaju.';
      return;
    }

    try {
      const result = await this.auth.registerUser({
        email: this.email,
        password: this.password,
        firstName: this.firstName,
        lastName: this.lastName,
        address: this.address,
        phone: this.phone,
        avatarUrl: this.avatarUrl
      });

      this.activationUrl = result.activationUrl;
      
      if (result.emailStatus === 'Mejl za aktivaciju je poslat.' || result.emailStatus === 'Mejl za aktivaciju vozača je poslat.') {
        this.messageVariant = 'success';
        this.message = `Aktivacioni mejl sa linkom je poslat na ${this.email}. Proveri inbox i spam.`;
        return;
      }

      this.messageVariant = 'warning';
      this.message = `Nalog je kreiran, a aktivacioni link je prikazan ispod. EmailJS nije potvrdio slanje: ${result.emailStatus}`;
    } catch (error) {
      this.messageVariant = 'danger';
      this.message = error instanceof Error ? error.message : 'Registracija nije uspela.';
    }
  }
}