import { NgClass } from '@angular/common';
import { Component, computed, effect, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { UserRole } from './models/role.model';
import { AuthService } from './services/auth.service';
import { AppStateService } from './services/app-state.service';

@Component({
  selector: 'app-root',
  imports: [NgClass, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly state = inject(AppStateService);
  private readonly router = inject(Router);
  private lastPanicCount = this.state.notifications().filter((notification) => notification.kind === 'panic').length;

  protected readonly currentUser = this.auth.currentUser;
  protected readonly publicLinks = [
    { label: 'Početna', path: '/' },
    { label: 'Prijava', path: '/login' },
    { label: 'Registracija', path: '/register' }
  ];

  protected readonly dashboardLink = computed(() => {
    const user = this.currentUser();
    return user ? ['/dashboard', user.role] : ['/login'];
  });

  protected readonly roleLabel = (role: UserRole | undefined): string => {
    switch (role) {
      case UserRole.Registered:
        return 'registrovani';
      case UserRole.Driver:
        return 'vozač';
      case UserRole.Admin:
        return 'admin';
      default:
        return 'gost';
    }
  };

  constructor() {
    effect(() => {
      const user = this.currentUser();
      const panicCount = this.state.notifications().filter((notification) => notification.kind === 'panic').length;

      if (user?.role === UserRole.Admin && panicCount > this.lastPanicCount) {
        this.playPanicSound();
      }

      this.lastPanicCount = panicCount;
    });
  }

  protected logout(): void {
    const result = this.auth.logout();
    if (!result.ok) {
      alert(result.message);
      return;
    }

    this.router.navigateByUrl('/');
  }

  private playPanicSound(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }

      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(660, context.currentTime + 0.12);
      oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.24);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.55);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.6);
      oscillator.onended = () => {
        context.close().catch(() => undefined);
      };
    } catch {
      return;
    }
  }
}
