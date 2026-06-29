import { Injectable, computed, inject, signal } from '@angular/core';

import { AppUser, UserRole, VehicleType } from '../models/role.model';
import { createDemoJwt } from '../utils/ride-utils';
import { ActivationEmailService } from './activation-email.service';
import { AppStateService } from './app-state.service';

interface SessionPayload {
  token: string;
  userId: string;
}

interface PasswordResetTicket {
  token: string;
  userId: string;
  expiresAt: string;
  used: boolean;
}

interface ActivationTicket {
  token: string;
  userId: string;
  expiresAt: string;
  role: UserRole;
}

type LoginResult = { ok: true; role: UserRole } | { ok: false; message: string };

type RegisterUserInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  address: string;
  phone: string;
  avatarUrl?: string;
};

type DriverAccountInput = {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  phone: string;
  vehicleModel: string;
  vehicleType: VehicleType;
  plate: string;
  seats: number;
  babyTransport: boolean;
  petTransport: boolean;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly state = inject(AppStateService);
  private readonly activationEmail = inject(ActivationEmailService);
  private readonly sessionStorageKey = 'uber-client.session';
  private readonly credentialsStorageKey = 'uber-client.credentials';
  private readonly resetStorageKey = 'uber-client.reset-tickets';
  private readonly activationStorageKey = 'uber-client.activation-tickets';

  private readonly credentialMap = signal<Record<string, string>>(this.restoreCredentials());
  private readonly resetTickets = signal<PasswordResetTicket[]>(this.restoreResetTickets());
  private readonly activationTickets = signal<ActivationTicket[]>(this.restoreActivationTickets());
  private readonly session = signal<SessionPayload | null>(this.restoreSession());

  readonly currentUser = computed<AppUser | null>(() => {
    const current = this.session();
    if (!current) {
      return null;
    }
    return this.state.getUser(current.userId) ?? null;
  });

  constructor() {
    this.seedCredentials();
  }

  login(email: string, password: string): LoginResult {
    const user = this.state.getUserByEmail(email);
    if (!user) {
      return { ok: false, message: 'Nalog sa ovom email adresom ne postoji.' };
    }

    if (!user.activated) {
      return { ok: false, message: 'Nalog nije aktiviran. Proveri aktivacioni email.' };
    }

    if (user.blocked) {
      return { ok: false, message: 'Nalog je blokiran od strane administratora.' };
    }

    const expectedPassword = this.credentialMap()[user.id];
    if (!expectedPassword || expectedPassword !== password) {
      return { ok: false, message: 'Pogrešna email adresa ili lozinka.' };
    }

    const token = createDemoJwt({ sub: user.id, role: user.role, email: user.email, iat: Date.now() });
    this.session.set({ token, userId: user.id });
    this.persistSession();

    if (user.role === UserRole.Driver) {
      this.state.updateDriverAvailability(user.id, true);
    }

    return { ok: true, role: user.role };
  }

  logout(): { ok: true } | { ok: false; message: string } {
    const user = this.currentUser();
    if (user?.role === UserRole.Driver && this.state.hasActiveRideForDriver(user.id)) {
      return { ok: false, message: 'Vozač se ne može odjaviti dok ima aktivnu vožnju.' };
    }

    if (user?.role === UserRole.Driver) {
      this.state.updateDriverAvailability(user.id, false);
    }

    this.session.set(null);
    localStorage.removeItem(this.sessionStorageKey);
    return { ok: true };
  }

  setDriverAvailability(active: boolean): { ok: true; message: string } | { ok: false; message: string } {
    const user = this.currentUser();
    if (!user || user.role !== UserRole.Driver) {
      return { ok: false, message: 'Samo prijavljen vozač može menjati dostupnost.' };
    }

    if (!active && this.state.hasActiveRideForDriver(user.id)) {
      this.state.updateUser(user.id, { pendingInactiveAfterRide: true });
      return { ok: true, message: 'Vozač će postati neaktivan nakon završetka trenutne vožnje.' };
    }

    this.state.updateUser(user.id, { pendingInactiveAfterRide: false });
    this.state.updateDriverAvailability(user.id, active);
    return { ok: true, message: active ? 'Vozač je sada aktivan.' : 'Vozač je sada neaktivan.' };
  }

  async registerUser(input: RegisterUserInput): Promise<{ activationToken: string; activationUrl: string; emailStatus: string }> {
    const activationToken = `activate-${Date.now()}`;
    const activationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const user = this.state.registerPassenger({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      address: input.address,
      phone: input.phone,
      avatarUrl: input.avatarUrl,
      activationToken,
      activationExpiresAt
    });
    try {
      localStorage.setItem('uber-client.users', JSON.stringify((this.state as any).users()));
    } catch {
      // ignore localStorage errors
    }

    this.credentialMap.update((map) => ({ ...map, [user.id]: input.password }));
    this.persistCredentials();
    try {
      localStorage.setItem(this.credentialsStorageKey, JSON.stringify(this.credentialMap()));
    } catch {
      // ignore localStorage errors
    }
    this.upsertActivationTicket({ token: activationToken, userId: user.id, expiresAt: activationExpiresAt, role: user.role });

    const activationUrl = `${window.location.origin}/activate?token=${activationToken}`;
    const emailResult = await this.activationEmail.sendActivationEmail({
      toEmail: user.email,
      toName: user.name,
      activationUrl,
      expiresInHours: 24,
      accountType: 'user'
    });

    return {
      activationToken,
      activationUrl: `/activate?token=${activationToken}`,
      emailStatus: emailResult.ok ? 'Mejl za aktivaciju je poslat.' : emailResult.message
    };
  }

  async createDriverByAdmin(input: DriverAccountInput): Promise<{ activationToken: string; activationUrl: string; emailStatus: string }> {
    const activationToken = `driver-activate-${Date.now()}`;
    const activationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const driver = this.state.createDriverAccount({
      ...input,
      activationToken,
      activationExpiresAt
    });

    this.upsertActivationTicket({ token: activationToken, userId: driver.id, expiresAt: activationExpiresAt, role: driver.role });

    const activationUrl = `${window.location.origin}/activate?token=${activationToken}&mode=driver`;
    const emailResult = await this.activationEmail.sendActivationEmail({
      toEmail: driver.email,
      toName: driver.name,
      activationUrl,
      expiresInHours: 24,
      accountType: 'driver'
    });

    return {
      activationToken,
      activationUrl: `/activate?token=${activationToken}&mode=driver`,
      emailStatus: emailResult.ok ? 'Mejl za aktivaciju vozača je poslat.' : emailResult.message
    };
  }

  activateAccount(token: string, password?: string): { ok: true; role: UserRole } | { ok: false; message: string } {
    const ticket = this.activationTickets().find((item) => item.token === token);
    if (ticket && new Date(ticket.expiresAt) < new Date()) {
      return { ok: false, message: 'Aktivacioni link je istekao.' };
    }

    const user = this.state.activateUserByToken(token) ?? (ticket ? this.state.getUser(ticket.userId) : undefined);
    if (!user) {
      return { ok: false, message: 'Aktivacioni link je nevažeći ili je istekao.' };
    }

    if (!user.activated) {
      this.state.updateUser(user.id, { activated: true, activationToken: undefined, activationExpiresAt: undefined });
    }

    this.activationTickets.update((items) => items.filter((item) => item.token !== token));
    this.persistActivationTickets();

    if (password) {
      this.credentialMap.update((map) => ({ ...map, [user.id]: password }));
      this.persistCredentials();
    }

    return { ok: true, role: user.role };
  }

  requestPasswordReset(email: string): { ok: true; resetUrl: string } | { ok: false; message: string } {
    const user = this.state.getUserByEmail(email);
    if (!user) {
      return { ok: false, message: 'Nalog sa ovom email adresom ne postoji.' };
    }

    const token = `reset-${Date.now()}`;
    const ticket: PasswordResetTicket = {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      used: false
    };

    this.resetTickets.update((items) => [ticket, ...items]);
    this.persistResetTickets();

    return { ok: true, resetUrl: `/reset-password?token=${token}` };
  }

  resetPassword(token: string, password: string): { ok: true } | { ok: false; message: string } {
    const ticket = this.resetTickets().find((item) => item.token === token);
    if (!ticket || ticket.used || new Date(ticket.expiresAt) < new Date()) {
      return { ok: false, message: 'Link za reset lozinke je istekao ili je već iskorišćen.' };
    }

    this.credentialMap.update((map) => ({ ...map, [ticket.userId]: password }));
    this.resetTickets.update((items) => items.map((item) => (item.token === token ? { ...item, used: true } : item)));
    this.persistCredentials();
    this.persistResetTickets();

    return { ok: true };
  }

  isAuthenticated(): boolean {
    return Boolean(this.currentUser());
  }

  getActivationTicket(token: string): ActivationTicket | undefined {
    return this.activationTickets().find((t) => t.token === token);
  }

  hasRole(role: UserRole): boolean {
    return this.currentUser()?.role === role;
  }

  private restoreSession(): SessionPayload | null {
    const raw = localStorage.getItem(this.sessionStorageKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as SessionPayload;
    } catch {
      return null;
    }
  }

  private persistSession(): void {
    const current = this.session();
    if (!current) {
      localStorage.removeItem(this.sessionStorageKey);
      return;
    }
    localStorage.setItem(this.sessionStorageKey, JSON.stringify(current));
  }

  private restoreCredentials(): Record<string, string> {
    const raw = localStorage.getItem(this.credentialsStorageKey);
    if (!raw) {
      return {};
    }

    try {
      return JSON.parse(raw) as Record<string, string>;
    } catch {
      return {};
    }
  }

  private persistCredentials(): void {
    localStorage.setItem(this.credentialsStorageKey, JSON.stringify(this.credentialMap()));
  }

  private restoreResetTickets(): PasswordResetTicket[] {
    const raw = localStorage.getItem(this.resetStorageKey);
    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as PasswordResetTicket[];
    } catch {
      return [];
    }
  }

  private persistResetTickets(): void {
    localStorage.setItem(this.resetStorageKey, JSON.stringify(this.resetTickets()));
  }

  private restoreActivationTickets(): ActivationTicket[] {
    const raw = localStorage.getItem(this.activationStorageKey);
    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as ActivationTicket[];
    } catch {
      return [];
    }
  }

  private persistActivationTickets(): void {
    localStorage.setItem(this.activationStorageKey, JSON.stringify(this.activationTickets()));
  }

  private upsertActivationTicket(ticket: ActivationTicket): void {
    this.activationTickets.update((items) => [ticket, ...items.filter((item) => item.token !== ticket.token)]);
    this.persistActivationTickets();
  }

  private seedCredentials(): void {
    const current = this.credentialMap();
    if (Object.keys(current).length > 0) {
      return;
    }

    const defaults: Record<string, string> = {};
    this.state.users().forEach((user) => {
      if (user.role === UserRole.Admin) {
        defaults[user.id] = 'admin123';
      } else if (user.role === UserRole.Driver) {
        defaults[user.id] = 'driver123';
      } else {
        defaults[user.id] = 'user123';
      }
    });

    this.credentialMap.set(defaults);
    this.persistCredentials();
  }
}