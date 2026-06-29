export enum UserRole {
  Guest = 'guest',
  Registered = 'registered',
  Driver = 'driver',
  Admin = 'admin'
}

export type VehicleType = 'standard' | 'luxury' | 'van';

export interface VehicleDetails {
  model: string;
  type: VehicleType;
  plate: string;
  seats: number;
  babyTransport: boolean;
  petTransport: boolean;
}

export interface AppUser {
  id: string;
  name: string;
  lastName?: string;
  role: UserRole;
  email: string;
  phone: string;
  address?: string;
  avatarUrl?: string;
  blocked: boolean;
  active: boolean;
  activated: boolean;
  activationToken?: string;
  activationExpiresAt?: string;
  pendingInactiveAfterRide?: boolean;
  workMinutesToday: number;
  vehicle?: string;
  vehicleDetails?: VehicleDetails;
  routeNote?: string;
}