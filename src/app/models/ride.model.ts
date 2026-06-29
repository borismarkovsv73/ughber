import { UserRole } from './role.model';

export type RideStatus = 'draft' | 'planned' | 'requested' | 'assigned' | 'accepted' | 'completed' | 'rejected' | 'cancelled';

export interface RideRecord {
  id: string;
  passengerId: string;
  passengerName: string;
  role: UserRole.Registered | UserRole.Guest;
  originId: string;
  destinationId: string;
  stopIds: string[];
  scheduledFor?: string;
  status: RideStatus;
  driverId?: string;
  driverName?: string;
  estimatedFare: number;
  estimatedVirtualMinutes: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  inconsistencyReports?: string[];
  passengerRating?: number;
  panicReportedAt?: string;
  cancelledAt?: string;
  cancelledByName?: string;
  cancelledByRole?: UserRole;
  rejectReason?: string;
  notes?: string;
}

export interface RouteDefinition {
  id: string;
  userId: string;
  name: string;
  originId: string;
  destinationId: string;
  stopIds: string[];
  note: string;
}

export interface RouteEstimate {
  distanceKm: number;
  estimatedVirtualMinutes: number;
  estimatedFare: number;
  routeLabel: string;
}
