import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AppUser, UserRole } from '../../models/role.model';
import { RideRecord } from '../../models/ride.model';
import { AppStateService } from '../../services/app-state.service';
import { AuthService } from '../../services/auth.service';
import { LeafletMapComponent } from '../../shared/leaflet-map/leaflet-map.component';

type AdminHistorySubject = 'passenger' | 'driver';
type AdminHistorySortField =
  | 'created'
  | 'route'
  | 'passenger'
  | 'driver'
  | 'start'
  | 'end'
  | 'origin'
  | 'destination'
  | 'cancelled'
  | 'cancelledBy'
  | 'fare'
  | 'panic'
  | 'inconsistency'
  | 'rating';
type AdminHistorySortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-admin-ride-history-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LeafletMapComponent],
  templateUrl: './admin-ride-history-page.component.html',
  styleUrl: './admin-ride-history-page.component.css'
})
export class AdminRideHistoryPageComponent {
  protected readonly state = inject(AppStateService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  @ViewChild('detailsAnchor')
  private readonly detailsAnchor?: ElementRef<HTMLElement>;

  protected readonly currentUser = this.auth.currentUser;
  protected historySubject: AdminHistorySubject = 'passenger';
  protected historyUserId = this.defaultHistoryUserId();
  protected historyDate = '';
  protected historySortField: AdminHistorySortField = 'created';
  protected historySortDirection: AdminHistorySortDirection = 'desc';
  protected selectedRideId = '';

  constructor() {
    const user = this.currentUser();
    if (!user || user.role !== UserRole.Admin) {
      this.router.navigateByUrl(user ? `/dashboard/${user.role}` : '/login');
    }
  }

  get historyUsers(): AppUser[] {
    return this.state.users().filter((user) => {
      if (this.historySubject === 'driver') {
        return user.role === UserRole.Driver;
      }

      return user.role === UserRole.Registered || user.role === UserRole.Guest;
    });
  }

  get selectedHistoryUser(): AppUser | undefined {
    return this.historyUsers.find((user) => user.id === this.historyUserId) ?? this.historyUsers[0];
  }

  get filteredHistoryRides(): RideRecord[] {
    const user = this.selectedHistoryUser;
    if (!user) {
      return [];
    }

    const rides = this.state.rides().filter((ride) => {
      if (this.historySubject === 'driver') {
        return ride.driverId === user.id;
      }

      return ride.passengerId === user.id;
    });

    return rides.filter((ride) => !this.historyDate || ride.createdAt.startsWith(this.historyDate));
  }

  get sortedHistoryRides(): RideRecord[] {
    return [...this.filteredHistoryRides].sort((left, right) => {
      const direction = this.historySortDirection === 'asc' ? 1 : -1;
      const leftValue = this.historySortValue(left, this.historySortField);
      const rightValue = this.historySortValue(right, this.historySortField);

      if (typeof leftValue === 'string' && typeof rightValue === 'string') {
        return leftValue.localeCompare(rightValue) * direction;
      }

      return (Number(leftValue) - Number(rightValue)) * direction;
    });
  }

  get selectedRide(): RideRecord | undefined {
    return this.sortedHistoryRides.find((ride) => ride.id === this.selectedRideId) ?? this.sortedHistoryRides[0];
  }

  get selectedRidePoints() {
    const ride = this.selectedRide;
    return ride ? this.state.getRoutePoints(ride.originId, ride.destinationId, ride.stopIds) : [];
  }

  get selectedPassenger(): AppUser | undefined {
    const ride = this.selectedRide;
    return ride ? this.state.getUser(ride.passengerId) : undefined;
  }

  get selectedDriver(): AppUser | undefined {
    const ride = this.selectedRide;
    return ride?.driverId ? this.state.getUser(ride.driverId) : undefined;
  }

  get totalCount(): number {
    return this.filteredHistoryRides.length;
  }

  get cancelledCount(): number {
    return this.filteredHistoryRides.filter((ride) => ride.status === 'cancelled').length;
  }

  get panicCount(): number {
    return this.filteredHistoryRides.filter((ride) => Boolean(ride.panicReportedAt)).length;
  }

  goBack(): void {
    this.router.navigateByUrl('/dashboard/admin');
  }

  setHistorySubject(subject: AdminHistorySubject): void {
    this.historySubject = subject;
    this.historyUserId = this.defaultHistoryUserId();
    this.historySortField = 'created';
    this.historySortDirection = 'desc';
    this.selectedRideId = '';
  }

  setHistoryUser(userId: string): void {
    this.historyUserId = userId;
    this.selectedRideId = '';
  }

  setHistorySort(field: AdminHistorySortField): void {
    if (this.historySortField === field) {
      this.historySortDirection = this.historySortDirection === 'asc' ? 'desc' : 'asc';
      return;
    }

    this.historySortField = field;
    this.historySortDirection = field === 'created' || field === 'start' || field === 'end' ? 'desc' : 'asc';
  }

  sortArrow(field: AdminHistorySortField): string {
    if (this.historySortField !== field) {
      return '';
    }

    return this.historySortDirection === 'asc' ? '↑' : '↓';
  }

  openRideDetails(rideId: string): void {
    this.selectedRideId = rideId;
    queueMicrotask(() => {
      this.detailsAnchor?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  repeatRideNow(ride: RideRecord): void {
    const user = this.currentUser();
    const passengerId = user?.role === UserRole.Admin ? ride.passengerId : user?.id ?? ride.passengerId;
    const passengerName = user?.role === UserRole.Admin ? ride.passengerName : user?.name ?? ride.passengerName;

    const nowRide = this.state.createRide({
      passengerId,
      passengerName,
      role: ride.role,
      originId: ride.originId,
      destinationId: ride.destinationId,
      stopIds: ride.stopIds,
      scheduledFor: undefined,
      notes: `Ponovljena ruta iz istorije: ${this.historyRouteLabel(ride)}`
    });

    const driver = this.state.availableDrivers()[0] ?? this.state.getOrCreateUser('Auto Driver', UserRole.Driver);
    this.state.updateDriverAvailability(driver.id, true);
    this.state.acceptRide(nowRide.id, driver.id);
    this.selectedRideId = nowRide.id;
  }

  repeatRideLater(ride: RideRecord): void {
    const user = this.currentUser();
    const passengerId = user?.role === UserRole.Admin ? ride.passengerId : user?.id ?? ride.passengerId;
    const passengerName = user?.role === UserRole.Admin ? ride.passengerName : user?.name ?? ride.passengerName;
    const scheduledFor = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const plannedRide = this.state.createRide({
      passengerId,
      passengerName,
      role: ride.role,
      originId: ride.originId,
      destinationId: ride.destinationId,
      stopIds: ride.stopIds,
      scheduledFor,
      notes: `Ruta zakazana kasnije iz istorije: ${this.historyRouteLabel(ride)}`
    });

    this.selectedRideId = plannedRide.id;
  }

  historyRouteLabel(ride: RideRecord): string {
    return `${this.state.getLocationLabel(ride.originId)} → ${this.state.getLocationLabel(ride.destinationId)}`;
  }

  historyStartDate(ride: RideRecord): Date {
    return new Date(ride.startedAt ?? ride.createdAt);
  }

  historyEndDate(ride: RideRecord): Date {
    return new Date(ride.completedAt ?? ride.cancelledAt ?? ride.createdAt);
  }

  cancelledByLabel(ride: RideRecord): string {
    if (ride.status !== 'cancelled') {
      return '-';
    }

    return ride.cancelledByName ?? 'Nepoznato';
  }

  panicLabel(ride: RideRecord): string {
    return ride.panicReportedAt ? 'Da' : 'Ne';
  }

  rideStatusLabel(ride: RideRecord): string {
    switch (ride.status) {
      case 'cancelled':
        return 'Otkazana';
      case 'completed':
        return 'Završena';
      case 'rejected':
        return 'Odbijena';
      case 'accepted':
        return 'Prihvaćena';
      case 'assigned':
        return 'Dodeljena';
      case 'planned':
        return 'Zakazana';
      case 'requested':
        return 'Zatražena';
      default:
        return ride.status;
    }
  }

  userStatusLabel(user: AppUser | undefined): string {
    if (!user) {
      return 'Nepoznat nalog';
    }

    const stateLabel = user.blocked ? 'Blokiran' : user.active ? 'Aktivan' : 'Neaktivan';
    return `${stateLabel} • ${user.activated ? 'Aktiviran' : 'Nije aktiviran'}`;
  }

  private defaultHistoryUserId(): string {
    return this.historyUsers[0]?.id ?? this.state.users().find((user) => user.role === UserRole.Driver)?.id ?? '';
  }

  private historySortValue(ride: RideRecord, field: AdminHistorySortField): string | number {
    switch (field) {
      case 'created':
        return new Date(ride.createdAt).getTime();
      case 'route':
        return this.historyRouteLabel(ride);
      case 'passenger':
        return ride.passengerName;
      case 'driver':
        return ride.driverName ?? '';
      case 'start':
        return this.historyStartDate(ride).getTime();
      case 'end':
        return this.historyEndDate(ride).getTime();
      case 'origin':
        return this.state.getLocationLabel(ride.originId);
      case 'destination':
        return this.state.getLocationLabel(ride.destinationId);
      case 'cancelled':
        return ride.status === 'cancelled' ? 1 : 0;
      case 'cancelledBy':
        return ride.cancelledByName ?? '';
      case 'fare':
        return ride.estimatedFare;
      case 'panic':
        return ride.panicReportedAt ? 1 : 0;
      case 'inconsistency':
        return ride.inconsistencyReports?.length ?? 0;
      case 'rating':
        return ride.passengerRating ?? 0;
      default:
        return 0;
    }
  }
}