import type { ChatMessage, NotificationItem } from '../models/notification.model';
import type { MapPoint } from '../models/map-point.model';
import type { RideRecord, RouteDefinition } from '../models/ride.model';
import type { ActiveVehicle } from '../models/vehicle.model';
import { AppUser, UserRole } from '../models/role.model';

export const demoLocations: MapPoint[] = [
  { id: 'airport', name: 'Aerodrom', zone: 'Novi Beograd', lat: 44.818, lng: 20.306 },
  { id: 'center', name: 'Centar', zone: 'Stari grad', lat: 44.8206, lng: 20.4612 },
  { id: 'university', name: 'Fakultet', zone: 'Vračar', lat: 44.8034, lng: 20.4749 },
  { id: 'new-belgrade', name: 'Novi Beograd', zone: 'Blok 37', lat: 44.8125, lng: 20.4158 },
  { id: 'zemun', name: 'Zemun', zone: 'Gardoš', lat: 44.8459, lng: 20.4013 },
  { id: 'ada', name: 'Ada Ciganlija', zone: 'Čukarica', lat: 44.7852, lng: 20.4073 },
  { id: 'dorcol', name: 'Dorćol', zone: 'Centar', lat: 44.8235, lng: 20.4697 },
  { id: 'batajnica', name: 'Batajnica', zone: 'Pik zone', lat: 44.9448, lng: 20.2794 }
];

export const demoUsers: AppUser[] = [
  {
    id: 'user-mina',
    name: 'Mina Jovanović',
    lastName: 'Jovanović',
    role: UserRole.Registered,
    email: 'mina@example.com',
    phone: '+381 64 111 2233',
    address: 'Bulevar kralja Aleksandra 73, Beograd',
    avatarUrl: 'https://i.pravatar.cc/160?img=47',
    blocked: false,
    active: false,
    activated: true,
    workMinutesToday: 0,
    routeNote: 'Najčešće putuje do fakulteta i centra.'
  },
  {
    id: 'driver-marko',
    name: 'Marko Petrović',
    lastName: 'Petrović',
    role: UserRole.Driver,
    email: 'marko.driver@example.com',
    phone: '+381 64 222 3344',
    address: 'Jurija Gagarina 52, Beograd',
    avatarUrl: 'https://i.pravatar.cc/160?img=13',
    blocked: false,
    active: true,
    activated: true,
    workMinutesToday: 305,
    vehicle: 'Toyota Corolla • BG-123-XY',
    vehicleDetails: {
      model: 'Toyota Corolla',
      type: 'standard',
      plate: 'BG-123-XY',
      seats: 4,
      babyTransport: false,
      petTransport: true
    },
    routeNote: 'Vozi gradske i aerodromske ture.'
  },
  {
    id: 'admin-jelena',
    name: 'Jelena Ilić',
    lastName: 'Ilić',
    role: UserRole.Admin,
    email: 'jelena.admin@example.com',
    phone: '+381 64 555 6677',
    address: 'Resavska 29, Beograd',
    avatarUrl: 'https://i.pravatar.cc/160?img=32',
    blocked: false,
    active: true,
    activated: true,
    workMinutesToday: 0,
    routeNote: 'Dispatcher i podrška.'
  },
  {
    id: 'user-ana',
    name: 'Ana Stojanov',
    lastName: 'Stojanov',
    role: UserRole.Registered,
    email: 'ana@example.com',
    phone: '+381 64 888 9900',
    address: 'Cara Dušana 44, Novi Sad',
    avatarUrl: 'https://i.pravatar.cc/160?img=51',
    blocked: true,
    active: false,
    activated: true,
    workMinutesToday: 0,
    routeNote: 'Blokirana zbog dugovanja.'
  }
];

export const demoRoutes: RouteDefinition[] = [
  {
    id: 'route-a1',
    userId: 'user-mina',
    name: 'Fakultet -> Centar',
    originId: 'university',
    destinationId: 'center',
    stopIds: ['dorcol'],
    note: 'Kombinovana ruta sa jednom usputnom stanicom.'
  },
  {
    id: 'route-a2',
    userId: 'user-mina',
    name: 'Aerodromski transfer',
    originId: 'new-belgrade',
    destinationId: 'airport',
    stopIds: [],
    note: 'Za buduće putovanje iz grada na aerodrom.'
  }
];

export const demoRides: RideRecord[] = [
  {
    id: 'ride-101',
    passengerId: 'user-mina',
    passengerName: 'Mina Jovanović',
    role: UserRole.Registered,
    originId: 'university',
    destinationId: 'center',
    stopIds: ['dorcol'],
    status: 'completed',
    driverId: 'driver-marko',
    driverName: 'Marko Petrović',
    estimatedFare: 9.8,
    estimatedVirtualMinutes: 28,
    createdAt: '2026-06-28T08:15:00',
    startedAt: '2026-06-28T08:20:00',
    completedAt: '2026-06-28T08:48:00',
    inconsistencyReports: [],
    passengerRating: 5,
    notes: 'Planirana vožnja je uspešno realizovana.'
  },
  {
    id: 'ride-102',
    passengerId: 'user-mina',
    passengerName: 'Mina Jovanović',
    role: UserRole.Registered,
    originId: 'center',
    destinationId: 'ada',
    stopIds: [],
    status: 'completed',
    driverId: 'driver-marko',
    driverName: 'Marko Petrović',
    estimatedFare: 11.4,
    estimatedVirtualMinutes: 19,
    createdAt: '2026-06-20T12:05:00',
    startedAt: '2026-06-20T12:07:00',
    completedAt: '2026-06-20T12:26:00',
    inconsistencyReports: [],
    passengerRating: 5,
    notes: 'Završena gradska vožnja.'
  },
  {
    id: 'ride-201',
    passengerId: 'user-mina',
    passengerName: 'Mina Jovanović',
    role: UserRole.Registered,
    originId: 'airport',
    destinationId: 'center',
    stopIds: [],
    status: 'completed',
    driverId: 'driver-marko',
    driverName: 'Marko Petrović',
    estimatedFare: 16.9,
    estimatedVirtualMinutes: 36,
    createdAt: '2026-06-28T09:40:00',
    startedAt: '2026-06-28T09:45:00',
    completedAt: '2026-06-28T10:21:00',
    inconsistencyReports: ['Putnik prijavio kašnjenje vozača za polazak.'],
    passengerRating: 4,
    panicReportedAt: '2026-06-28T10:10:00',
    notes: 'Vožnja je završena uz prijavu kašnjenja.'
  },
  {
    id: 'ride-202',
    passengerId: 'user-mina',
    passengerName: 'Mina Jovanović',
    role: UserRole.Registered,
    originId: 'new-belgrade',
    destinationId: 'zemun',
    stopIds: [],
    status: 'completed',
    driverId: 'driver-marko',
    driverName: 'Marko Petrović',
    estimatedFare: 8.7,
    estimatedVirtualMinutes: 14,
    createdAt: '2026-06-24T07:50:00',
    startedAt: '2026-06-24T07:53:00',
    completedAt: '2026-06-24T08:07:00',
    inconsistencyReports: [],
    passengerRating: 4,
    notes: 'Jutarnja gradska vožnja uspešno završena.'
  },
  {
    id: 'ride-240',
    passengerId: 'user-mina',
    passengerName: 'Mina Jovanović',
    role: UserRole.Registered,
    originId: 'center',
    destinationId: 'airport',
    stopIds: [],
    status: 'requested',
    driverId: 'driver-marko',
    driverName: 'Marko Petrović',
    estimatedFare: 15.8,
    estimatedVirtualMinutes: 34,
    createdAt: '2026-06-29T08:10:00',
    inconsistencyReports: [],
    notes: 'Testna vožnja za Markovu listu za prihvatanje.'
  },
  {
    id: 'ride-241',
    passengerId: 'user-ana',
    passengerName: 'Ana Stojanov',
    role: UserRole.Registered,
    originId: 'new-belgrade',
    destinationId: 'ada',
    stopIds: ['center'],
    status: 'assigned',
    driverId: 'driver-marko',
    driverName: 'Marko Petrović',
    estimatedFare: 13.6,
    estimatedVirtualMinutes: 27,
    createdAt: '2026-06-29T08:18:00',
    scheduledFor: '2026-06-29T08:45:00',
    inconsistencyReports: [],
    notes: 'Dodeljena vožnja koja treba da se vidi u driver queue.'
  },
  {
    id: 'ride-250',
    passengerId: 'user-ana',
    passengerName: 'Ana Stojanov',
    role: UserRole.Registered,
    originId: 'ada',
    destinationId: 'center',
    stopIds: ['dorcol'],
    status: 'cancelled',
    driverId: 'driver-marko',
    driverName: 'Marko Petrović',
    estimatedFare: 10.6,
    estimatedVirtualMinutes: 21,
    createdAt: '2026-06-22T14:05:00',
    startedAt: '2026-06-22T14:12:00',
    cancelledAt: '2026-06-22T14:18:00',
    cancelledByName: 'Ana Stojanov',
    cancelledByRole: UserRole.Registered,
    inconsistencyReports: ['Putnik je otkazao vožnju neposredno nakon dodele.'],
    notes: 'Primer otkazane vožnje sa evidentiranim otkazivanjem.'
  },
  {
    id: 'ride-260',
    passengerId: 'user-mina',
    passengerName: 'Mina Jovanović',
    role: UserRole.Registered,
    originId: 'zemun',
    destinationId: 'new-belgrade',
    stopIds: ['center'],
    status: 'completed',
    driverId: 'driver-marko',
    driverName: 'Marko Petrović',
    estimatedFare: 12.4,
    estimatedVirtualMinutes: 22,
    createdAt: '2026-06-29T07:25:00',
    startedAt: '2026-06-29T07:31:00',
    completedAt: '2026-06-29T07:53:00',
    inconsistencyReports: [],
    passengerRating: 5,
    notes: 'Testna vožnja završena da vozač može normalno da se odjavi.'
  },
  {
    id: 'ride-261',
    passengerId: 'user-ana',
    passengerName: 'Ana Stojanov',
    role: UserRole.Registered,
    originId: 'airport',
    destinationId: 'ada',
    stopIds: [],
    status: 'rejected',
    driverId: 'driver-marko',
    driverName: 'Marko Petrović',
    estimatedFare: 18.2,
    estimatedVirtualMinutes: 31,
    createdAt: '2026-06-27T18:15:00',
    rejectReason: 'Vozač je već imao pun raspored za taj termin.',
    inconsistencyReports: ['Putnik je dobio odbijanje nakon dodele vozača.'],
    notes: 'Testna odbijena vožnja za Markovu istoriju.'
  },
  {
    id: 'ride-301',
    passengerId: 'user-ana',
    passengerName: 'Ana Stojanov',
    role: UserRole.Registered,
    originId: 'new-belgrade',
    destinationId: 'dorcol',
    stopIds: ['center'],
    status: 'rejected',
    rejectReason: 'Vozač je prijavio prevelik obim saobraćaja.',
    estimatedFare: 13.1,
    estimatedVirtualMinutes: 24,
    createdAt: '2026-06-23T17:30:00',
    inconsistencyReports: ['Korisnik prijavio nelogičnu promenu rute.'],
    passengerRating: 2,
    notes: 'Primer odbijene vožnje.'
  }
];

export const demoNotifications: NotificationItem[] = [
  {
    id: 'note-1',
    kind: 'panic',
    title: 'PANIC od registrovanog korisnika',
    message: 'Vozač se čudno ponaša...',
    timestamp: '2026-06-28T10:10:00',
    sourcePhone: '+381 64 111 2233',
    target: 'admin',
    read: false
  },
  {
    id: 'note-2',
    kind: 'warning',
    title: 'Vozač blizu limita',
    message: 'Marko Petrović ima 5h 05m virtualnog rada danas.',
    timestamp: '2026-06-28T11:05:00',
    target: 'driver',
    read: false
  },
  {
    id: 'note-3',
    kind: 'success',
    title: 'Nova potvrđena vožnja',
    message: 'Raspoređena je vožnja sa Aerodroma do centra grada.',
    timestamp: '2026-06-28T09:44:00',
    target: 'registered',
    read: true
  }
];

export const demoChat: ChatMessage[] = [
  {
    id: 'chat-1',
    sender: 'user',
    senderName: 'Mina Jovanović',
    message: 'Potreban mi je povratni kontakt za kasnu vožnju.',
    timestamp: '2026-06-28T10:12:00'
  },
  {
    id: 'chat-2',
    sender: 'support',
    senderName: 'Dispatcher',
    message: 'Poruka je primljena, vozač je obavešten i prati se situacija.',
    timestamp: '2026-06-28T10:13:00'
  }
];

export const demoVehicles: ActiveVehicle[] = [
  {
    id: 'vehicle-marko',
    driverName: 'Marko Petrović',
    vehicleLabel: 'Toyota Corolla • BG-123-XY',
    lat: 44.823,
    lng: 20.452,
    active: true,
    availability: 'busy',
    lastUpdate: '2026-06-28T12:18:00'
  },
  {
    id: 'vehicle-ivana',
    driverName: 'Ivana Nikolić',
    vehicleLabel: 'Škoda Octavia • BG-446-RS',
    lat: 44.809,
    lng: 20.433,
    active: true,
    availability: 'free',
    lastUpdate: '2026-06-28T12:16:00'
  },
  {
    id: 'vehicle-petar',
    driverName: 'Petar Milenković',
    vehicleLabel: 'Hyundai i30 • BG-991-GH',
    lat: 44.838,
    lng: 20.468,
    active: true,
    availability: 'free',
    lastUpdate: '2026-06-28T12:20:00'
  }
];
