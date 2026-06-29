import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';

import { UserRole } from '../../models/role.model';
import { AuthService } from '../../services/auth.service';
import { AppStateService } from '../../services/app-state.service';

@Component({
  selector: 'app-activate-account-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activate-account-page.component.html',
  styleUrl: './activate-account-page.component.css'
})
export class ActivateAccountPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly state = inject(AppStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected password = '';
  protected confirmPassword = '';
  protected message = '';
  protected success = false;
  protected token = '';
  protected mode: 'user' | 'driver' = 'user';

  ngOnInit(): void {
    this.route.queryParamMap.pipe(take(1)).subscribe((params) => {
      this.token = params.get('token') ?? '';
      this.mode = params.get('mode') === 'driver' ? 'driver' : 'user';

      if (!this.token) {
        // try robust parsing from full URL if Angular didn't provide the query param
        try {
          const url = new URL(window.location.href);
          this.token = this.token || (url.searchParams.get('token') || '');
        } catch {
          // ignore
        }

        if (!this.token) {
          const hash = window.location.hash || '';
          const hashMatch = hash.match(/token=([^&]+)/);
          if (hashMatch) {
            this.token = decodeURIComponent(hashMatch[1]);
          }
        }

        if (!this.token) {
          const pathParts = window.location.pathname.split('/').filter(Boolean);
          const candidate = pathParts.find((p) => p.startsWith('activate-') || p.startsWith('driver-activate-'));
          if (candidate) {
            this.token = candidate;
          }
        }

        if (!this.token) {
          this.success = false;
          this.message = 'Nedostaje aktivacioni token u linku.';
          return;
        }
      }

      if (this.mode !== 'driver') {
        this.submit();
      }
    });
  }

  submit(): void {
    if (!this.token) {
      this.message = 'Nedostaje aktivacioni token.';
      return;
    }

    if (this.mode === 'driver') {
      if (!this.password || this.password !== this.confirmPassword) {
        this.message = 'Vozač mora uneti i potvrditi lozinku.';
        return;
      }
    }

    const result = this.auth.activateAccount(this.token, this.password || undefined);
    if (!result.ok) {
      // Diagnostic: check if a user exists with this token in state
      const user = this.state.getUserByActivationToken(this.token);
      const ticket = this.auth.getActivationTicket(this.token);

      if (user) {
        const expired = !user.activationExpiresAt || new Date(user.activationExpiresAt) < new Date();
        this.message = expired ? 'Aktivacioni token je istekao prema korisničkom zapisu.' : `Pronađen korisnik (${user.email}) sa tokenom, ali aktivacija nije uspela: ${result.message}`;
      } else if (ticket) {
        const expired = new Date(ticket.expiresAt) < new Date();
        this.message = expired ? 'Aktivacioni tiket je istekao.' : `Tiket postoji za userId=${ticket.userId}, ali aktivacija nije uspela: ${result.message}`;
      } else {
        this.message = `${result.message} (token: ${this.token})`;
      }

      this.success = false;
      return;
    }

    this.success = true;
    this.message = result.role === UserRole.Driver
      ? 'Vozački nalog je aktiviran i lozinka je postavljena.'
      : 'Korisnički nalog je uspešno aktiviran.';
    setTimeout(() => this.router.navigate(['/login']), 1000);
  }

  
}