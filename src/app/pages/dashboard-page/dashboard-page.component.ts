import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { MapPoint } from '../../models/map-point.model';
import { AppStateService } from '../../services/app-state.service';
import { AuthService } from '../../services/auth.service';
import { LeafletMapComponent } from '../../shared/leaflet-map/leaflet-map.component';
import { NotificationItem } from '../../models/notification.model';
import { AppUser, UserRole } from '../../models/role.model';
import { RideRecord } from '../../models/ride.model';
import { buildRouteEstimate } from '../../utils/ride-utils';

type HistorySortField = 'route' | 'start' | 'end' | 'driver' | 'inconsistency' | 'rating';
type HistorySortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LeafletMapComponent],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css'
})
export class DashboardPageComponent {
  protected readonly state = inject(AppStateService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly currentUser = this.auth.currentUser;
  protected readonly locations = this.state.locations;
  protected readonly activeVehicles = computed(() => this.state.activeVehicles().filter((vehicle) => vehicle.active));
  protected readonly role = signal<UserRole>(this.route.snapshot.paramMap.get('role') as UserRole);
  protected originText = '';
  protected destinationText = '';
  protected stopText = '';
  protected budget = 32;
  protected estimate = {
    distanceKm: 0,
    estimatedVirtualMinutes: 0,
    estimatedFare: 0,
    routeLabel: 'Unesi adresu i pritisni procenu'
  };
  protected registeredMapPoints: MapPoint[] = [];
  protected showEstimateForm = true;
  protected hasEstimate = false;
  protected errorMessage = '';
  protected readonly liveRide = computed(() => {
    const user = this.currentUser();
    if (!user) {
      return undefined;
    }

    if (user.role === UserRole.Driver) {
      return this.state.getActiveRideForDriver(user.id);
    }

    if (user.role === UserRole.Registered) {
      return this.state.getActiveRideForPassenger(user.id);
    }

    return this.state.rides().find((ride) => ride.status === 'accepted' || ride.status === 'assigned');
  });

  protected readonly liveRidePoint = computed(() => {
    const ride = this.liveRide();
    return ride ? this.state.getRideLivePoint(ride.id) : undefined;
  });

  protected readonly panicRide = computed(() => {
    const user = this.currentUser();

    if (user?.role === UserRole.Admin) {
      return this.state.rides().find((ride) => Boolean(ride.panicReportedAt) && (ride.status === 'requested' || ride.status === 'planned' || ride.status === 'assigned' || ride.status === 'accepted'));
    }

    const ride = this.liveRide();
    return ride?.panicReportedAt ? ride : undefined;
  });

  protected readonly panicRidePoint = computed(() => {
    const ride = this.panicRide();
    return ride ? this.state.getRideLivePoint(ride.id) : undefined;
  });

  protected readonly liveRideCountdown = computed(() => {
    const ride = this.liveRide();
    if (!ride) {
      return 'Nema aktivne vožnje';
    }

    const remaining = this.state.getRideSimulationRemainingSeconds(ride.id);
    return `Preostalo vreme: ${remaining} s`;
  });

  protected originId = this.locations()[0].id;
  protected destinationId = this.locations()[1].id;
  protected futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  protected futureTime = '18:30';
  protected historyDate = new Date().toISOString().slice(0, 10);
  protected panicReason = '';
  protected routeName = 'Fakultet -> Centar';
  protected routeNote = 'Brza urbana ruta za svakodnevni transfer.';
  protected profileName = this.currentUser()?.name ?? '';
  protected profilePhone = this.currentUser()?.phone ?? '';
  protected profileEmail = this.currentUser()?.email ?? '';
  protected bookingNotes = 'Više stanica i fleksibilna vožnja.';
  protected driverEmail = 'novi.vozac@example.com';
  protected driverName = 'Novi Vozač';
  protected driverVehicle = 'Škoda Octavia • BG-777-RS';
  protected driverFirstName = 'Novi';
  protected driverLastName = 'Vozač';
  protected driverAddress = 'Autoput za Zagreb 14, Beograd';
  protected driverPhone = '+381 64 777 6655';
  protected driverVehicleModel = 'Škoda Octavia';
  protected driverVehicleType: 'standard' | 'luxury' | 'van' = 'standard';
  protected driverPlate = 'BG-777-RS';
  protected driverSeats = 4;
  protected driverBabyTransport = false;
  protected driverPetTransport = true;
  protected driverActivationLink = '';
  protected driverReason = 'Saobraćajna gužva i bezbednosni rizik.';
  protected chatDraft = 'Potrebna je pomoć oko incidenta i preusmeravanja vožnje.';
  protected selectedRideId = '';
  protected selectedHistoryRideId = '';
  protected historySortField: HistorySortField = 'start';
  protected historySortDirection: HistorySortDirection = 'desc';
  protected reportPreview = this.state.generateAdminReport();
  protected driverDecisionReasons: Record<string, string> = {};

  constructor() {
    const user = this.currentUser();
    if (user?.role === UserRole.Driver) {
      const queue = this.state.getDriverQueue(user.id);
      this.selectedRideId = queue[0]?.id ?? '';
    } else if (user?.role === UserRole.Registered) {
      const history = this.state.getPassengerHistory(user.id);
      this.selectedRideId = history[0]?.id ?? '';
      this.selectedHistoryRideId = history[0]?.id ?? '';
    } else {
      this.selectedRideId = this.state.rides()[0]?.id ?? '';
    }
  }

  get normalizedRole(): UserRole {
    return this.role() ?? UserRole.Registered;
  }

  get selectedRoleLabel(): string {
    switch (this.normalizedRole) {
      case UserRole.Driver:
        return 'Vozač';
      case UserRole.Admin:
        return 'Admin';
      case UserRole.Registered:
        return 'Registrovani korisnik';
      default:
        return 'Neregistrovani';
    }
  }

  get roleBadge(): string {
    return `badge-${this.normalizedRole}`;
  }

  get currentProfile(): AppUser | null {
    return this.currentUser();
  }

  get currentEstimate() {
    if (this.normalizedRole === UserRole.Registered && this.hasEstimate) {
      return this.estimate;
    }

    return this.state.getRouteEstimate(this.originId, this.destinationId, this.getStopIds());
  }

  get currentRidePreview() {
    if (this.normalizedRole === UserRole.Registered && this.hasEstimate) {
      return this.registeredMapPoints;
    }

    const selectedHistoryRide = this.selectedHistoryRide;
    if (this.normalizedRole === UserRole.Registered && selectedHistoryRide) {
      return this.state.getRoutePoints(selectedHistoryRide.originId, selectedHistoryRide.destinationId, selectedHistoryRide.stopIds);
    }

    const ride = this.liveRide() ?? this.driverQueue[0] ?? this.passengerHistory[0] ?? this.state.rides()[0];
    return ride ? this.state.getRoutePoints(ride.originId, ride.destinationId, ride.stopIds) : this.registeredMapPoints;
  }

  get currentRideTitle(): string {
    if (this.normalizedRole === UserRole.Registered && this.hasEstimate) {
      return this.estimate.routeLabel;
    }

    const selectedHistoryRide = this.selectedHistoryRide;
    if (this.normalizedRole === UserRole.Registered && selectedHistoryRide) {
      return this.historyRouteLabel(selectedHistoryRide);
    }

    const ride = this.liveRide();
    if (ride) {
      return `${this.state.getLocationLabel(ride.originId)} → ${this.state.getLocationLabel(ride.destinationId)}`;
    }

    const fallback = this.currentRidePreview;
    return fallback.length ? `${fallback[0].name} → ${fallback[fallback.length - 1].name}` : 'Aktivna ruta';
  }

  get mapPoints() {
    if (this.normalizedRole === UserRole.Driver) {
      const user = this.currentUser();
      const ride = user ? this.state.getDriverQueue(user.id)[0] ?? this.state.getDriverHistory(user.id)[0] : undefined;
      if (ride) {
        return this.state.getRoutePoints(ride.originId, ride.destinationId, ride.stopIds);
      }
    }

    if (this.normalizedRole === UserRole.Admin) {
      const ride = this.state.rides()[0];
      if (ride) {
        return this.state.getRoutePoints(ride.originId, ride.destinationId, ride.stopIds);
      }
    }

    const stops = this.getStopIds();
    return this.state.getRoutePoints(this.originId, this.destinationId, stops);
  }

  get passengerHistory() {
    const user = this.currentUser();
    return user ? this.state.getPassengerHistory(user.id, this.historyDate) : [];
  }

  get sortedPassengerHistory(): RideRecord[] {
    return [...this.passengerHistory].sort((left, right) => {
      const direction = this.historySortDirection === 'asc' ? 1 : -1;

      switch (this.historySortField) {
        case 'route':
          return this.historyRouteLabel(left).localeCompare(this.historyRouteLabel(right)) * direction;
        case 'start':
          return (this.historyStartDate(left).getTime() - this.historyStartDate(right).getTime()) * direction;
        case 'end':
          return (this.historyEndDate(left).getTime() - this.historyEndDate(right).getTime()) * direction;
        case 'driver':
          return (left.driverName ?? '').localeCompare(right.driverName ?? '') * direction;
        case 'inconsistency':
          return ((left.inconsistencyReports?.length ?? 0) - (right.inconsistencyReports?.length ?? 0)) * direction;
        case 'rating':
          return ((left.passengerRating ?? 0) - (right.passengerRating ?? 0)) * direction;
        default:
          return 0;
      }
    });
  }

  get selectedHistoryRide(): RideRecord | undefined {
    return this.sortedPassengerHistory.find((ride) => ride.id === this.selectedHistoryRideId);
  }

  get passengerRoutes() {
    const user = this.currentUser();
    return user ? this.state.getSavedRoutesForUser(user.id) : [];
  }

  get driverQueue() {
    const user = this.currentUser();
    return user ? this.state.getDriverQueue(user.id) : [];
  }

  get driverHistory() {
    const user = this.currentUser();
    return user ? this.state.getDriverHistory(user.id) : [];
  }

  get adminUsers() {
    return this.state.users().filter((user) => user.role !== UserRole.Admin);
  }

  get panicNotifications() {
    return this.state.notifications().filter((notification) => notification.kind === 'panic' && !notification.read);
  }

  
  getNotificationPhone(notification: NotificationItem): string | undefined {
    return notification.sourcePhone ?? (notification.sourceUserId ? this.state.getUser(notification.sourceUserId)?.phone : undefined);
  }

  get revealedPanicEntries(): { id: string; phone: string }[] {
    return [];
  }

  get supportChat() {
    return this.state.chat();
  }

  refreshPreview(): void {
    this.reportPreview = this.normalizedRole === UserRole.Admin ? this.state.generateAdminReport() : this.state.generateDriverReport(this.currentUser()?.id ?? '');
  }

  submitRegisteredRide(): void {
    const user = this.currentUser();
    if (!user) {
      return;
    }

    if (!this.hasEstimate || this.registeredMapPoints.length < 2) {
      this.errorMessage = 'Prvo unesi polazište i destinaciju i pritisni procenu.';
      return;
    }

    const routeIds = this.registeredMapPoints.map((point) => this.state.addOrGetLocation(point).id);
    const originId = routeIds[0];
    const destinationId = routeIds[routeIds.length - 1];
    const stopIds = routeIds.slice(1, -1);

    const ride = this.state.createRide({
      passengerId: user.id,
      passengerName: user.name,
      role: UserRole.Registered,
      originId,
      destinationId,
      stopIds,
      scheduledFor: undefined,
      notes: this.bookingNotes
    });

    const driver = this.state.availableDrivers()[0] ?? this.state.getOrCreateUser('Auto Driver', UserRole.Driver);
    this.state.updateDriverAvailability(driver.id, true);
    this.state.acceptRide(ride.id, driver.id);

    this.reportPreview = 'Nova vožnja je pokrenuta i prikazuje se na mapi.';
    this.selectedHistoryRideId = ride.id;
  }

  saveRoute(): void {
    const user = this.currentUser();
    if (!user) {
      return;
    }

    if (this.normalizedRole === UserRole.Registered && this.hasEstimate && this.registeredMapPoints.length >= 2) {
      const routeIds = this.registeredMapPoints.map((point) => this.state.addOrGetLocation(point).id);
      const originId = routeIds[0];
      const destinationId = routeIds[routeIds.length - 1];
      const stopIds = routeIds.slice(1, -1);

      this.state.saveRouteDefinition(user.id, this.routeName, originId, destinationId, stopIds, this.routeNote);
      this.reportPreview = 'Ruta je sačuvana za buduću upotrebu.';
      return;
    }

    this.state.saveRouteDefinition(user.id, this.routeName, this.originId, this.destinationId, this.getStopIds(), this.routeNote);
    this.reportPreview = 'Ruta je sačuvana za buduću upotrebu.';
  }

  sendPanic(): void {
    const user = this.currentUser();
    if (!user) {
      return;
    }

    const reason = (this.panicReason || '').trim();
    if (!reason) {
      this.reportPreview = 'Moraš uneti razlog pre slanja PANIC prijave.';
      return;
    }

    this.state.sendPanicNotification(user, reason);
    this.reportPreview = 'PANIC je prosleđen dispatcheru i vozilo je označeno na mapi.';
    this.panicReason = '';
  }

  updateProfile(): void {
    const user = this.currentUser();
    if (!user) {
      return;
    }

    this.state.updateProfile(user.id, {
      name: this.profileName,
      phone: this.profilePhone,
      email: this.profileEmail
    });
    this.reportPreview = 'Profil je ažuriran.';
  }

  toggleDriverStatus(): void {
    const user = this.currentUser();
    if (!user) {
      return;
    }

    const result = this.auth.setDriverAvailability(!user.active);
    this.reportPreview = result.message;
  }

  acceptRide(rideId: string): void {
    const user = this.currentUser();
    if (!user) {
      return;
    }

    this.state.acceptRide(rideId, user.id);
    this.refreshPreview();
  }

  rejectRide(rideId: string): void {
    const user = this.currentUser();
    if (!user) {
      return;
    }

    const reason = (this.driverDecisionReasons[rideId] || '').trim();
    if (!reason) {
      this.reportPreview = 'Za odbijanje moraš da uneseš razlog.';
      return;
    }

    this.state.rejectRide(rideId, user.id, reason);
    this.refreshPreview();
  }

  async createDriver(): Promise<void> {
    const result = await this.auth.createDriverByAdmin({
      email: this.driverEmail,
      firstName: this.driverFirstName,
      lastName: this.driverLastName,
      address: this.driverAddress,
      phone: this.driverPhone,
      vehicleModel: this.driverVehicleModel,
      vehicleType: this.driverVehicleType,
      plate: this.driverPlate,
      seats: this.driverSeats,
      babyTransport: this.driverBabyTransport,
      petTransport: this.driverPetTransport
    });

    this.driverActivationLink = result.activationUrl;
    this.reportPreview = `${result.emailStatus} Aktivacioni link (24h): ${result.activationUrl}`;
  }

  openAdminRideHistory(): void {
    this.router.navigateByUrl('/admin/ride-history');
  }

  toggleBlock(userId: string): void {
    this.state.toggleBlockUser(userId);
  }

  sendChat(): void {
    const user = this.currentUser();
    this.state.sendChatMessage(user?.name ?? 'Admin', this.chatDraft, 'admin');
    this.chatDraft = '';
  }

  markPanicRead(notificationId: string): void {
    this.state.markNotificationRead(notificationId);
  }

  setHistorySort(field: HistorySortField): void {
    if (this.historySortField === field) {
      this.historySortDirection = this.historySortDirection === 'asc' ? 'desc' : 'asc';
      return;
    }

    this.historySortField = field;
    this.historySortDirection = field === 'start' ? 'desc' : 'asc';
  }

  sortArrow(field: HistorySortField): string {
    if (this.historySortField !== field) {
      return '';
    }

    return this.historySortDirection === 'asc' ? '↑' : '↓';
  }

  openRideDetails(rideId: string): void {
    this.selectedHistoryRideId = rideId;
    this.hasEstimate = false;
  }

  repeatRideNow(ride: RideRecord): void {
    const user = this.currentUser();
    if (!user) {
      return;
    }

    const nowRide = this.state.createRide({
      passengerId: user.id,
      passengerName: user.name,
      role: UserRole.Registered,
      originId: ride.originId,
      destinationId: ride.destinationId,
      stopIds: ride.stopIds,
      scheduledFor: undefined,
      notes: `Ponovljena ruta iz istorije: ${this.historyRouteLabel(ride)}`
    });

    const driver = this.state.availableDrivers()[0] ?? this.state.getOrCreateUser('Auto Driver', UserRole.Driver);
    this.state.updateDriverAvailability(driver.id, true);
    this.state.acceptRide(nowRide.id, driver.id);
    this.selectedHistoryRideId = nowRide.id;
    this.reportPreview = 'Ista ruta je ponovo poručena odmah.';
  }

  repeatRideLater(ride: RideRecord): void {
    const user = this.currentUser();
    if (!user) {
      return;
    }

    const scheduledFor = this.futureDate && this.futureTime ? `${this.futureDate}T${this.futureTime}:00` : new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const plannedRide = this.state.createRide({
      passengerId: user.id,
      passengerName: user.name,
      role: UserRole.Registered,
      originId: ride.originId,
      destinationId: ride.destinationId,
      stopIds: ride.stopIds,
      scheduledFor,
      notes: `Ruta zakazana kasnije iz istorije: ${this.historyRouteLabel(ride)}`
    });

    this.selectedHistoryRideId = plannedRide.id;
    this.reportPreview = 'Ista ruta je uspešno zakazana za kasnije.';
  }

  historyRouteLabel(ride: RideRecord): string {
    return `${this.state.getLocationLabel(ride.originId)} → ${this.state.getLocationLabel(ride.destinationId)}`;
  }

  historyStartDate(ride: RideRecord): Date {
    return new Date(ride.startedAt ?? ride.createdAt);
  }

  historyEndDate(ride: RideRecord): Date {
    return new Date(ride.completedAt ?? ride.createdAt);
  }

  private getStopIds(): string[] {
    return this.stopText
      .split(',')
      .map((stop) => stop.trim())
      .filter(Boolean)
      .map((name) => this.locations().find((location) => location.name.toLowerCase().includes(name.toLowerCase()))?.id)
      .filter((id): id is string => Boolean(id) && id !== this.originId && id !== this.destinationId);
  }

  async calculatePassengerEstimate(): Promise<void> {
    const origin = await this.geocodeAddress(this.originText);
    const destination = await this.geocodeAddress(this.destinationText);

    if (!origin || !destination) {
      this.errorMessage = 'Nisam mogao da pronađem jednu od unetih adresa. Proveri unos i pokušaj ponovo.';
      this.hasEstimate = false;
      return;
    }

    this.errorMessage = '';
    const stops = await this.geocodeStops();
    const routePoints = [origin, ...stops, destination];

    this.estimate = buildRouteEstimate(routePoints);
    this.registeredMapPoints = routePoints;
    this.hasEstimate = true;
  }

  resetPassengerEstimate(): void {
    this.originText = '';
    this.destinationText = '';
    this.stopText = '';
    this.errorMessage = '';
    this.hasEstimate = false;
    this.registeredMapPoints = [];
    this.estimate = {
      distanceKm: 0,
      estimatedVirtualMinutes: 0,
      estimatedFare: 0,
      routeLabel: 'Unesi adresu i pritisni procenu'
    };
  }

  private getPassengerStops(): string[] {
    return this.stopText
      .split(',')
      .map((stop) => stop.trim())
      .filter(Boolean);
  }

  private async geocodeStops(): Promise<MapPoint[]> {
    const stops = await Promise.all(this.getPassengerStops().map((stop, index) => this.geocodeAddress(stop, index + 1)));
    return stops.filter((stop): stop is MapPoint => Boolean(stop));
  }

  private async geocodeAddress(query: string, index = 0): Promise<MapPoint | undefined> {
    const trimmed = query.trim();
    if (!trimmed) {
      return undefined;
    }

    const exactLocation = this.locations().find((location) => location.name.toLowerCase() === trimmed.toLowerCase() || `${location.name}, ${location.zone}`.toLowerCase() === trimmed.toLowerCase());
    if (exactLocation) {
      return {
        id: exactLocation.id,
        name: exactLocation.name,
        zone: exactLocation.zone,
        lat: exactLocation.lat,
        lng: exactLocation.lng
      };
    }

    const searchUrl = new URL('https://nominatim.openstreetmap.org/search');
    searchUrl.searchParams.set('format', 'jsonv2');
    searchUrl.searchParams.set('q', trimmed);
    searchUrl.searchParams.set('limit', '1');
    searchUrl.searchParams.set('addressdetails', '1');

    const response = await fetch(searchUrl.toString(), {
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      return undefined;
    }

    const results = (await response.json()) as Array<{ display_name: string; lat: string; lon: string }>;
    const result = results[0];
    if (!result) {
      return undefined;
    }

    return {
      id: `custom-${Date.now()}-${index}`,
      name: trimmed,
      zone: result.display_name,
      lat: Number(result.lat),
      lng: Number(result.lon)
    };
  }

}
