import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-driver-registration-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-driver-registration-page.component.html',
  styleUrl: './admin-driver-registration-page.component.css'
})
export class AdminDriverRegistrationPageComponent {
  private readonly auth = inject(AuthService);
  protected readonly currentUser = this.auth.currentUser;
  protected readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');

  protected email = '';
  protected firstName = '';
  protected lastName = '';
  protected address = '';
  protected phone = '';
  protected vehicleModel = '';
  protected vehicleType: 'standard' | 'luxury' | 'van' = 'standard';
  protected plate = '';
  protected seats = 4;
  protected babyTransport = false;
  protected petTransport = false;
  protected activationUrl = '';
  protected message = '';

  async submit(): Promise<void> {
    if (!this.isAdmin()) {
      this.message = 'Samo administrator može kreirati vozačke naloge.';
      return;
    }

    const result = await this.auth.createDriverByAdmin({
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      address: this.address,
      phone: this.phone,
      vehicleModel: this.vehicleModel,
      vehicleType: this.vehicleType,
      plate: this.plate,
      seats: this.seats,
      babyTransport: this.babyTransport,
      petTransport: this.petTransport
    });

    this.activationUrl = result.activationUrl;
    this.message = result.emailStatus;
  }
}