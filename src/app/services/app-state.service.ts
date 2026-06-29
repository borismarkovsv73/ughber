import { Injectable, computed, signal } from '@angular/core';

import { demoChat, demoLocations, demoNotifications, demoRides, demoRoutes, demoUsers, demoVehicles } from '../data/demo-data';
import { ChatMessage, NotificationItem } from '../models/notification.model';
import type { MapPoint } from '../models/map-point.model';
import { RideRecord, RouteDefinition, RouteEstimate } from '../models/ride.model';
import { ActiveVehicle } from '../models/vehicle.model';
import { AppUser, UserRole } from '../models/role.model';
import { buildRouteEstimate, formatVirtualDuration } from '../utils/ride-utils';

interface BookingDraft {
  passengerName: string;
  passengerId: string;
  role: UserRole.Registered | UserRole.Guest;
  originId: string;
  destinationId: string;
  stopIds: string[];
  scheduledFor?: string;
  notes?: string;
}

interface PassengerRegistrationDraft {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  phone: string;
  avatarUrl?: string;
  activationToken: string;
  activationExpiresAt: string;
}

interface DriverRegistrationDraft {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  phone: string;
  vehicleModel: string;
  vehicleType: 'standard' | 'luxury' | 'van';
  plate: string;
  seats: number;
  babyTransport: boolean;
  petTransport: boolean;
  activationToken: string;
  activationExpiresAt: string;
}

interface RideSimulationState {
  rideId: string;
  elapsedSeconds: number;
  totalSeconds: number;
  startedAt: string;
}

@Injectable({ providedIn: 'root' })
export class AppStateService {
  readonly locations = signal<MapPoint[]>(demoLocations);
  readonly users = signal<AppUser[]>(this.restoreUsers());
  readonly rides = signal<RideRecord[]>(demoRides);
  readonly savedRoutes = signal<RouteDefinition[]>(demoRoutes);
  readonly notifications = signal<NotificationItem[]>(demoNotifications);
  readonly chat = signal<ChatMessage[]>(demoChat);
  readonly activeVehicles = signal<ActiveVehicle[]>(demoVehicles);
  readonly rideSimulations = signal<Record<string, RideSimulationState>>({});
  private readonly usersStorageKey = 'uber-client.users';

  readonly availableDrivers = computed(() => this.users().filter((user) => user.role === UserRole.Driver && !user.blocked && user.active));

  constructor() {
    this.persistUsers();
    setInterval(() => this.advanceRideSimulations(), 1000);
    // no-op
  }

  getLocation(id: string): MapPoint {
    const location = this.locations().find((item) => item.id === id);
    if (!location) {
      throw new Error(`Nepoznata lokacija: ${id}`);
    }

    return location;
  }

  getLocationLabel(id: string): string {
    const location = this.locations().find((item) => item.id === id);
    return location ? `${location.name} (${location.zone})` : id;
  }

  getRouteEstimate(originId: string, destinationId: string, stopIds: string[] = []): RouteEstimate {
    const routePoints = [originId, ...stopIds, destinationId].map((id) => this.getLocation(id));
    return buildRouteEstimate(routePoints);
  }

  getRoutePoints(originId: string, destinationId: string, stopIds: string[] = []): MapPoint[] {
    return [originId, ...stopIds, destinationId].map((id) => this.getLocation(id));
  }

  addOrGetLocation(point: MapPoint): MapPoint {
    const normalizedName = point.name.trim().toLowerCase();
    const existing = this.locations().find((location) =>
      location.id === point.id ||
      (location.name.trim().toLowerCase() === normalizedName && Math.abs(location.lat - point.lat) < 0.0001 && Math.abs(location.lng - point.lng) < 0.0001) ||
      (Math.abs(location.lat - point.lat) < 0.0001 && Math.abs(location.lng - point.lng) < 0.0001)
    );

    if (existing) {
      return existing;
    }

    const idConflict = this.locations().some((location) => location.id === point.id);
    const next: MapPoint = {
      ...point,
      id: idConflict ? `custom-${Date.now()}` : point.id
    };

    this.locations.update((locations) => [...locations, next]);
    return next;
  }

  getUser(id: string): AppUser | undefined {
    return this.users().find((user) => user.id === id);
  }

  getUserByEmail(email: string): AppUser | undefined {
    const normalized = email.trim().toLowerCase();
    return this.users().find((user) => user.email.trim().toLowerCase() === normalized);
  }

  registerPassenger(draft: PassengerRegistrationDraft): AppUser {
    const user: AppUser = {
      id: `user-${Date.now()}`,
      name: `${draft.firstName} ${draft.lastName}`.trim(),
      lastName: draft.lastName.trim(),
      role: UserRole.Registered,
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      address: draft.address.trim(),
      avatarUrl: draft.avatarUrl?.trim() || 'https://i.pravatar.cc/160?img=15',
      blocked: false,
      active: false,
      activated: false,
      activationToken: draft.activationToken,
      activationExpiresAt: draft.activationExpiresAt,
      workMinutesToday: 0,
      routeNote: 'Novi korisnik čeka aktivaciju naloga.'
    };

    this.users.update((users) => [user, ...users]);
    this.persistUsers();
    return user;
  }

  createDriverAccount(draft: DriverRegistrationDraft): AppUser;
  createDriverAccount(name: string, email: string, vehicle: string): AppUser;
  createDriverAccount(draftOrName: DriverRegistrationDraft | string, email?: string, vehicle?: string): AppUser {
    if (typeof draftOrName === 'string') {
      return this.createDriverAccountLegacy(draftOrName, email ?? '', vehicle ?? '');
    }

    const draft = draftOrName;
    const driver: AppUser = {
      id: `driver-${Date.now()}`,
      name: `${draft.firstName} ${draft.lastName}`.trim(),
      lastName: draft.lastName.trim(),
      role: UserRole.Driver,
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      address: draft.address.trim(),
      avatarUrl: 'https://i.pravatar.cc/160?img=11',
      blocked: false,
      active: false,
      activated: false,
      activationToken: draft.activationToken,
      activationExpiresAt: draft.activationExpiresAt,
      workMinutesToday: 0,
      vehicle: `${draft.vehicleModel.trim()} • ${draft.plate.trim()}`,
      vehicleDetails: {
        model: draft.vehicleModel.trim(),
        type: draft.vehicleType,
        plate: draft.plate.trim(),
        seats: draft.seats,
        babyTransport: draft.babyTransport,
        petTransport: draft.petTransport
      },
      routeNote: 'Novi vozač čeka aktivaciju profila.'
    };

    this.users.update((users) => [driver, ...users]);
    this.persistUsers();
    return driver;
  }

  activateUserByToken(token: string): AppUser | undefined {
    const now = new Date();
    let activatedUser: AppUser | undefined;

    this.users.update((users) =>
      users.map((user) => {
        if (user.activationToken !== token) {
          return user;
        }

        if (!user.activationExpiresAt || new Date(user.activationExpiresAt) < now) {
          return user;
        }

        activatedUser = {
          ...user,
          activated: true,
          activationToken: undefined,
          activationExpiresAt: undefined
        };

        return activatedUser;
      })
    );

    this.persistUsers();

    return activatedUser;
  }

  hasActiveRideForDriver(driverId: string): boolean {
    return this.rides().some((ride) => ride.driverId === driverId && ride.status === 'accepted');
  }

  getActiveRideForDriver(driverId: string): RideRecord | undefined {
    return this.rides().find((ride) => ride.driverId === driverId && ride.status === 'accepted');
  }

  getActiveRideForPassenger(passengerId: string): RideRecord | undefined {
    return this.rides().find((ride) => ride.passengerId === passengerId && (ride.status === 'planned' || ride.status === 'requested' || ride.status === 'assigned' || ride.status === 'accepted'));
  }

  getRideSimulation(rideId: string): RideSimulationState | undefined {
    return this.rideSimulations()[rideId];
  }

  getRideSimulationRemainingSeconds(rideId: string): number {
    const simulation = this.getRideSimulation(rideId);
    if (!simulation) {
      return 0;
    }

    return Math.max(simulation.totalSeconds - simulation.elapsedSeconds, 0);
  }

  getRideLivePoint(rideId: string): MapPoint | undefined {
    const ride = this.rides().find((item) => item.id === rideId);
    const simulation = this.getRideSimulation(rideId);

    if (!ride || !simulation) {
      return undefined;
    }

    const routePoints = this.getRoutePoints(ride.originId, ride.destinationId, ride.stopIds);
    return this.interpolateRidePoint(routePoints, simulation.elapsedSeconds / simulation.totalSeconds);
  }

  getOrCreateUser(displayName: string, role: UserRole): AppUser {
    const normalizedName = displayName.trim().toLowerCase();
    const existing = this.users().find((user) => user.role === role && user.name.trim().toLowerCase() === normalizedName);

    if (existing) {
      return existing;
    }

    const created: AppUser = {
      id: `${role}-${Date.now()}`,
      name: displayName.trim(),
      role,
      email: `${displayName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '.') || role}@demo.local`,
      phone: '+381 60 000 0000',
      address: 'Demo adresa',
      avatarUrl: 'https://i.pravatar.cc/160?img=5',
      blocked: false,
      active: role === UserRole.Driver,
      activated: true,
      workMinutesToday: 0,
      routeNote: 'Demo nalog generisan za prijavu.'
    };

    this.users.update((users) => [created, ...users]);
    this.persistUsers();
    return created;
  }

  updateUser(userId: string, patch: Partial<AppUser>): void {
    this.users.update((users) => users.map((user) => (user.id === userId ? { ...user, ...patch } : user)));
    this.persistUsers();
  }

  createDriverAccountLegacy(name: string, email: string, vehicle: string): AppUser {
    const driver: AppUser = {
      id: `driver-${Date.now()}`,
      name: name.trim(),
      role: UserRole.Driver,
      email: email.trim(),
      phone: '+381 60 123 4567',
      address: 'Nije uneto',
      avatarUrl: 'https://i.pravatar.cc/160?img=11',
      blocked: false,
      active: false,
      activated: true,
      workMinutesToday: 0,
      vehicle: vehicle.trim(),
      routeNote: 'Novi nalog kreiran od strane admina.'
    };

    this.users.update((users) => [driver, ...users]);
    this.persistUsers();
    this.notifications.update((notes) => [
      {
        id: `note-${Date.now()}`,
        kind: 'success',
        title: 'Admin je kreirao vozača',
        message: `${driver.name} je dodat u sistem kao novi vozač.`,
        timestamp: new Date().toISOString(),
        target: 'admin',
        read: false
      },
      ...notes
    ]);

    return driver;
  }

  toggleBlockUser(userId: string): AppUser | undefined {
    let toggled: AppUser | undefined;
    this.users.update((users) =>
      users.map((user) => {
        if (user.id !== userId) {
          return user;
        }

        toggled = { ...user, blocked: !user.blocked };
        return toggled;
      })
    );

    this.persistUsers();

    return toggled;
  }

  sendPanicNotification(sender: AppUser, message: string): void {
    const trimmed = (message || '').trim();
    if (!trimmed) {
      console.warn('sendPanicNotification called with empty message; ignoring.');
      return;
    }
    const activeRide = sender.role === UserRole.Driver
      ? this.getActiveRideForDriver(sender.id)
      : sender.role === UserRole.Registered
        ? this.getActiveRideForPassenger(sender.id)
        : undefined;

    if (activeRide) {
      const panicTimestamp = new Date().toISOString();
      this.rides.update((rides) =>
        rides.map((ride) =>
          ride.id === activeRide.id
            ? {
                ...ride,
                panicReportedAt: panicTimestamp,
                inconsistencyReports: [...(ride.inconsistencyReports ?? []), trimmed]
              }
            : ride
        )
      );
    }

    const note: NotificationItem = {
      id: `panic-${Date.now()}`,
      kind: 'panic',
      title: `PANIC od ${sender.name}`,
      message: trimmed,
      sourceUserId: sender.id,
      sourcePhone: sender.phone,
      timestamp: new Date().toISOString(),
      target: 'admin',
      read: false
    };

    this.notifications.update((items) => [note, ...items]);
  }

  createRide(draft: BookingDraft): RideRecord {
    const estimate = this.getRouteEstimate(draft.originId, draft.destinationId, draft.stopIds);
    const ride: RideRecord = {
      id: `ride-${Date.now()}`,
      passengerId: draft.passengerId,
      passengerName: draft.passengerName,
      role: draft.role,
      originId: draft.originId,
      destinationId: draft.destinationId,
      stopIds: draft.stopIds,
      scheduledFor: draft.scheduledFor,
      status: draft.scheduledFor ? 'planned' : 'requested',
      estimatedFare: estimate.estimatedFare,
      estimatedVirtualMinutes: estimate.estimatedVirtualMinutes,
      createdAt: new Date().toISOString(),
      notes: draft.notes
    };

    this.rides.update((rides) => [ride, ...rides]);
    this.notifications.update((notes) => [
      {
        id: `note-${Date.now()}`,
        kind: 'info',
        title: 'Nova vožnja u sistemu',
        message: `${ride.passengerName} je prijavio ${estimate.routeLabel}.`,
        timestamp: new Date().toISOString(),
        target: 'driver',
        read: false
      },
      ...notes
    ]);

    return ride;
  }

  saveRouteDefinition(userId: string, name: string, originId: string, destinationId: string, stopIds: string[], note: string): RouteDefinition {
    const definition: RouteDefinition = {
      id: `route-${Date.now()}`,
      userId,
      name,
      originId,
      destinationId,
      stopIds,
      note
    };

    this.savedRoutes.update((routes) => [definition, ...routes]);
    return definition;
  }

  getPassengerHistory(passengerId: string, dateFilter?: string): RideRecord[] {
    return this.rides().filter((ride) => ride.passengerId === passengerId && (!dateFilter || ride.createdAt.startsWith(dateFilter)));
  }

  getSavedRoutesForUser(userId: string): RouteDefinition[] {
    return this.savedRoutes().filter((route) => route.userId === userId);
  }

  getDriverQueue(driverId: string): RideRecord[] {
    return this.rides().filter((ride) => (ride.status === 'requested' || ride.status === 'planned' || ride.status === 'assigned') && (!ride.driverId || ride.driverId === driverId));
  }

  getDriverHistory(driverId: string): RideRecord[] {
    return this.rides().filter((ride) => ride.driverId === driverId && (ride.status === 'accepted' || ride.status === 'completed' || ride.status === 'rejected'));
  }

  acceptRide(rideId: string, driverId: string): RideRecord | undefined {
    const driver = this.getUser(driverId);
    if (!driver) {
      return undefined;
    }

    let updatedRide: RideRecord | undefined;
    this.rides.update((rides) =>
      rides.map((ride) => {
        if (ride.id !== rideId) {
          return ride;
        }

        updatedRide = {
          ...ride,
          status: 'accepted',
          driverId,
          driverName: driver.name,
          startedAt: ride.startedAt ?? new Date().toISOString()
        };

        return updatedRide;
      })
    );

    if (updatedRide) {
      const acceptedRide = updatedRide;
      this.incrementDriverWorkload(driverId, acceptedRide.estimatedVirtualMinutes);
      this.startRideSimulation(acceptedRide);
      this.notifications.update((notes) => [
        {
          id: `note-${Date.now()}`,
          kind: 'success',
          title: 'Vožnja je prihvaćena',
          message: `${driver.name} je preuzeo vožnju ${acceptedRide.passengerName}.`,
          timestamp: new Date().toISOString(),
          target: 'registered',
          read: false
        },
        ...notes
      ]);
    }

    return updatedRide;
  }

  rejectRide(rideId: string, driverId: string, reason: string): RideRecord | undefined {
    const driver = this.getUser(driverId);
    if (!driver) {
      return undefined;
    }

    let updatedRide: RideRecord | undefined;
    this.rides.update((rides) =>
      rides.map((ride) => {
        if (ride.id !== rideId) {
          return ride;
        }

        updatedRide = {
          ...ride,
          status: 'rejected',
          driverId,
          driverName: driver.name,
          rejectReason: reason
        };

        return updatedRide;
      })
    );

    return updatedRide;
  }

  markCompleted(rideId: string): void {
    let completedDriverId: string | undefined;
    this.rides.update((rides) =>
      rides.map((ride) => {
        if (ride.id !== rideId) {
          return ride;
        }

        completedDriverId = ride.driverId;
        return {
          ...ride,
          status: 'completed',
          completedAt: new Date().toISOString(),
          passengerRating: ride.passengerRating ?? 5
        };
      })
    );

    if (!completedDriverId) {
      return;
    }

    this.rideSimulations.update((simulations) => {
      const next = { ...simulations };
      delete next[rideId];
      return next;
    });

    const driver = this.getUser(completedDriverId);
    if (driver?.pendingInactiveAfterRide) {
      this.updateUser(completedDriverId, { active: false, pendingInactiveAfterRide: false });
    }
  }

  updateDriverAvailability(driverId: string, active: boolean): AppUser | undefined {
    const driver = this.getUser(driverId);
    if (!driver || driver.role !== UserRole.Driver) {
      return undefined;
    }

    const updated = { ...driver, active: active && !driver.blocked };
    this.updateUser(driverId, updated);
    return updated;
  }

  incrementDriverWorkload(driverId: string, virtualMinutes: number): void {
    this.users.update((users) =>
      users.map((user) => {
        if (user.id !== driverId || user.role !== UserRole.Driver) {
          return user;
        }

        const workMinutesToday = user.workMinutesToday + virtualMinutes;
        const active = workMinutesToday < 480 && !user.blocked;
        return { ...user, workMinutesToday, active };
      })
    );

    this.persistUsers();
  }

  updateProfile(userId: string, patch: Partial<AppUser>): AppUser | undefined {
    const user = this.getUser(userId);
    if (!user) {
      return undefined;
    }

    const updated = { ...user, ...patch };
    this.updateUser(userId, updated);
    return updated;
  }

  markNotificationRead(notificationId: string): void {
    this.notifications.update((notes) => notes.map((note) => (note.id === notificationId ? { ...note, read: true } : note)));
  }

  sendChatMessage(senderName: string, message: string, sender: ChatMessage['sender'] = 'admin'): void {
    const userMessage: ChatMessage = {
      id: `chat-${Date.now()}`,
      sender,
      senderName,
      message,
      timestamp: new Date().toISOString()
    };

    const supportReply: ChatMessage = {
      id: `chat-${Date.now()}-reply`,
      sender: 'support',
      senderName: 'Dispatcher',
      message: 'Poruka je zabeležena. Uključen je live support i praćenje incidenta.',
      timestamp: new Date().toISOString()
    };

    this.chat.update((messages) => [supportReply, userMessage, ...messages]);
  }

  generateDriverReport(driverId: string): string {
    const driver = this.getUser(driverId);
    if (!driver) {
      return 'Vozač nije pronađen.';
    }

    const driverRides = this.getDriverHistory(driverId);
    const accepted = driverRides.filter((ride) => ride.status === 'accepted' || ride.status === 'completed').length;
    const rejected = driverRides.filter((ride) => ride.status === 'rejected').length;

    return [
      `Izveštaj za ${driver.name}`,
      `Ukupno vožnji: ${driverRides.length}`,
      `Prihvaćeno/odvezeno: ${accepted}`,
      `Odbijeno: ${rejected}`,
      `Radni sati: ${formatVirtualDuration(driver.workMinutesToday)}`
    ].join(' • ');
  }

  generateAdminReport(): string {
    const drivers = this.users().filter((user) => user.role === UserRole.Driver);
    const blocked = this.users().filter((user) => user.blocked).length;
    const panicCount = this.notifications().filter((note) => note.kind === 'panic').length;
    const rides = this.rides().length;

    return `Sistem ima ${drivers.length} vozača, ${rides} vožnji, ${blocked} blokiranih naloga i ${panicCount} PANIC prijava.`;
  }

  private advanceRideSimulations(): void {
    const simulations = this.rideSimulations();
    const ridesToComplete: string[] = [];

    Object.values(simulations).forEach((simulation) => {
      const ride = this.rides().find((item) => item.id === simulation.rideId);
      if (!ride || ride.status !== 'accepted') {
        return;
      }

      const nextElapsed = simulation.elapsedSeconds + 1;
      if (nextElapsed >= simulation.totalSeconds) {
        ridesToComplete.push(simulation.rideId);
        return;
      }

      this.rideSimulations.update((current) => ({
        ...current,
        [simulation.rideId]: {
          ...simulation,
          elapsedSeconds: nextElapsed
        }
      }));
    });

    ridesToComplete.forEach((rideId) => this.markCompleted(rideId));
  }

  private startRideSimulation(ride: RideRecord): void {
    const totalSeconds = Math.max(ride.estimatedVirtualMinutes, 12);
    this.rideSimulations.update((simulations) => ({
      ...simulations,
      [ride.id]: {
        rideId: ride.id,
        elapsedSeconds: 0,
        totalSeconds,
        startedAt: new Date().toISOString()
      }
    }));
  }

  private interpolateRidePoint(points: MapPoint[], progress: number): MapPoint | undefined {
    if (!points.length) {
      return undefined;
    }

    if (points.length === 1) {
      return points[0];
    }

    const clamped = Math.min(Math.max(progress, 0), 1);
    const scaled = clamped * (points.length - 1);
    const leftIndex = Math.min(Math.floor(scaled), points.length - 2);
    const segmentProgress = scaled - leftIndex;
    const left = points[leftIndex];
    const right = points[leftIndex + 1];

    return {
      id: `live-${left.id}-${right.id}`,
      name: 'Trenutna vožnja',
      zone: `${Math.round(clamped * 100)}% rute`,
      lat: left.lat + (right.lat - left.lat) * segmentProgress,
      lng: left.lng + (right.lng - left.lng) * segmentProgress
    };
  }

  private restoreUsers(): AppUser[] {
    const raw = localStorage.getItem(this.usersStorageKey);
    if (!raw) {
      return demoUsers;
    }

    try {
      const users = JSON.parse(raw) as AppUser[];
      return users && users.length ? users : demoUsers;
    } catch {
      return demoUsers;
    }
  }

  private persistUsers(): void {
    try {
      const current = this.users();
      let existing: AppUser[] = [];
      try {
        const raw = localStorage.getItem(this.usersStorageKey);
        if (raw) {
          existing = JSON.parse(raw) as AppUser[];
        }
      } catch {
        existing = [];
      }

      const map = new Map<string, AppUser>();
      existing.forEach((u) => map.set(u.id, u));
      current.forEach((u) => map.set(u.id, u));

      const merged = Array.from(map.values());
      localStorage.setItem(this.usersStorageKey, JSON.stringify(merged));
      // keep in-memory in sync with merged result
      if (merged.length !== this.users().length) {
        this.users.set(merged);
      }
    } catch (e) {
      // ignore persistence errors
    }
  }

  getUserByActivationToken(token: string) {
    return this.users().find((u) => u.activationToken === token);
  }
}
