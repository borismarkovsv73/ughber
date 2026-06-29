import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import * as L from 'leaflet';

import { MapPoint } from '../../models/map-point.model';
import { ActiveVehicle } from '../../models/vehicle.model';

@Component({
  selector: 'app-leaflet-map',
  standalone: true,
  templateUrl: './leaflet-map.component.html',
  styleUrl: './leaflet-map.component.css'
})
export class LeafletMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapHost', { static: true })
  private readonly mapHost?: ElementRef<HTMLDivElement>;

  @Input() title = 'OSM mapa';
  @Input() points: MapPoint[] = [];
  @Input() vehicles: ActiveVehicle[] = [];
  @Input() livePoint?: MapPoint;
  @Input() panicPoint?: MapPoint;

  private map?: L.Map;
  private layerGroup = L.layerGroup();
  private initialized = false;

  ngAfterViewInit(): void {
    if (!this.mapHost) {
      return;
    }

    this.map = L.map(this.mapHost.nativeElement, {
      zoomControl: true,
      scrollWheelZoom: false
    }).setView([44.8125, 20.46], 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.layerGroup.addTo(this.map);
    this.initialized = true;
    this.drawMapData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.initialized && (changes['points'] || changes['vehicles'] || changes['title'] || changes['livePoint'] || changes['panicPoint'])) {
      this.drawMapData();
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private drawMapData(): void {
    if (!this.map) {
      return;
    }

    this.layerGroup.clearLayers();

    const bounds = L.latLngBounds([]);

    this.vehicles.forEach((vehicle) => {
      const statusLabel = vehicle.availability === 'busy' ? 'Zauzeto' : 'Slobodno';
      const marker = L.circleMarker([vehicle.lat, vehicle.lng], {
        radius: 9,
        color: vehicle.availability === 'busy' ? '#ef4444' : '#22c55e',
        weight: 3,
        fillColor: vehicle.availability === 'busy' ? '#f87171' : '#4ade80',
        fillOpacity: 0.95
      });

      marker.bindPopup(`<strong>${vehicle.vehicleLabel}</strong><br>Vozač: ${vehicle.driverName}<br>Status: ${statusLabel}`);
      marker.addTo(this.layerGroup);
      bounds.extend([vehicle.lat, vehicle.lng]);
    });

    if (this.livePoint) {
      const marker = L.circleMarker([this.livePoint.lat, this.livePoint.lng], {
        radius: 11,
        color: '#f97316',
        weight: 4,
        fillColor: '#fdba74',
        fillOpacity: 0.95
      });

      marker.bindPopup(`<strong>${this.livePoint.name}</strong><br>${this.livePoint.zone}`);
      marker.addTo(this.layerGroup);
      bounds.extend([this.livePoint.lat, this.livePoint.lng]);
    }

    if (this.panicPoint) {
      const panicOuter = L.circleMarker([this.panicPoint.lat, this.panicPoint.lng], {
        radius: 18,
        color: '#b91c1c',
        weight: 5,
        fillColor: '#ef4444',
        fillOpacity: 0.25
      });

      const panicInner = L.circleMarker([this.panicPoint.lat, this.panicPoint.lng], {
        radius: 8,
        color: '#ffffff',
        weight: 3,
        fillColor: '#dc2626',
        fillOpacity: 0.98
      });

      panicOuter.bindPopup(`<strong>PANIC</strong><br>${this.panicPoint.name}<br>${this.panicPoint.zone}`);
      panicOuter.addTo(this.layerGroup);
      panicInner.addTo(this.layerGroup);
      bounds.extend([this.panicPoint.lat, this.panicPoint.lng]);
    }

    if (!this.points.length) {
      if (bounds.isValid()) {
        this.map.fitBounds(bounds.pad(0.2));
      } else {
        this.map.setView([44.8125, 20.46], 11);
      }
      return;
    }

    const colors = ['#38bdf8', '#fbbf24', '#22c55e', '#fb7185', '#a78bfa'];

    this.points.forEach((point, index) => {
      const marker = L.circleMarker([point.lat, point.lng], {
        radius: index === 0 || index === this.points.length - 1 ? 10 : 7,
        color: colors[index % colors.length],
        weight: 3,
        fillColor: colors[index % colors.length],
        fillOpacity: 0.85
      });

      marker.bindPopup(`<strong>${point.name}</strong><br>${point.zone}`);
      marker.addTo(this.layerGroup);
      bounds.extend([point.lat, point.lng]);
    });

    if (this.points.length > 1) {
      L.polyline(this.points.map((point) => [point.lat, point.lng]), {
        color: '#fbbf24',
        weight: 4,
        opacity: 0.85,
        dashArray: '8 8'
      }).addTo(this.layerGroup);
    }

    this.map.fitBounds(bounds.pad(0.2));
  }
}
