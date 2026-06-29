export type VehicleAvailability = 'free' | 'busy';

export interface ActiveVehicle {
  id: string;
  driverName: string;
  vehicleLabel: string;
  lat: number;
  lng: number;
  active: boolean;
  availability: VehicleAvailability;
  lastUpdate: string;
}
