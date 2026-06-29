import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MapPoint } from '../../models/map-point.model';
import { AppStateService } from '../../services/app-state.service';
import { LeafletMapComponent } from '../../shared/leaflet-map/leaflet-map.component';
import { buildRouteEstimate } from '../../utils/ride-utils';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LeafletMapComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css'
})
export class HomePageComponent {
  private readonly state = inject(AppStateService);

  protected readonly locations = this.state.locations;
  protected readonly activeVehicles = computed(() => this.state.activeVehicles().filter((vehicle) => vehicle.active));

  protected originText = '';
  protected destinationText = '';
  protected stopText = '';
  protected budget = 25;
  protected estimate = {
    distanceKm: 0,
    estimatedVirtualMinutes: 0,
    estimatedFare: 0,
    routeLabel: 'Unesi adresu i pritisni procenu'
  };
  protected mapPoints: MapPoint[] = [];
  protected showEstimateForm = false;
  protected hasEstimate = false;
  protected errorMessage = '';

  get mapTitle(): string {
    return this.hasEstimate ? this.estimate.routeLabel : 'Trenutno aktivna vozila';
  }

  openEstimateForm(): void {
    this.showEstimateForm = true;
  }

  cancelEstimate(): void {
    this.showEstimateForm = false;
  }

  async calculate(): Promise<void> {
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
    this.mapPoints = routePoints;
    this.hasEstimate = true;
  }

  private getStops(): string[] {
    return this.stopText
      .split(',')
      .map((stop) => stop.trim())
      .filter(Boolean);
  }

  private async geocodeStops(): Promise<MapPoint[]> {
    const stops = await Promise.all(this.getStops().map((stop, index) => this.geocodeAddress(stop, index + 1)));
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
