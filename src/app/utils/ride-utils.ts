import type { MapPoint } from '../models/map-point.model';
import type { RouteEstimate } from '../models/ride.model';

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 1
  }).format(amount);
}

export function formatVirtualDuration(totalVirtualMinutes: number): string {
  const hours = Math.floor(totalVirtualMinutes / 60);
  const minutes = totalVirtualMinutes % 60;
  return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`;
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('sr-RS', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

export function formatDay(value: string): string {
  return new Intl.DateTimeFormat('sr-RS', {
    dateStyle: 'medium'
  }).format(new Date(value));
}

export function buildRouteEstimate(points: MapPoint[]): RouteEstimate {
  const distanceKm = roundToOneDecimal(points.slice(1).reduce((sum, point, index) => {
    const previous = points[index];
    return sum + haversineKm(previous, point);
  }, 0));
  const estimatedVirtualMinutes = Math.max(12, Math.round(distanceKm * 4.5 + Math.max(points.length - 2, 0) * 6 + 8));
  const estimatedFare = roundToOneDecimal(2.9 + distanceKm * 1.05 + Math.max(points.length - 2, 0) * 1.25);

  return {
    distanceKm,
    estimatedVirtualMinutes,
    estimatedFare,
    routeLabel: points.map((point) => point.name).join(' → ')
  };
}

export function createDemoJwt(payload: Record<string, unknown>): string {
  return `${encodeBase64({ alg: 'HS256', typ: 'JWT' })}.${encodeBase64(payload)}.demo-signature`;
}

export function decodeDemoJwt(token: string): Record<string, unknown> | null {
  const [, payload] = token.split('.');

  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64(payload)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function haversineKm(first: MapPoint, second: MapPoint): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(second.lat - first.lat);
  const dLng = toRadians(second.lng - first.lng);
  const lat1 = toRadians(first.lat);
  const lat2 = toRadians(second.lat);
  const haversine = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine));
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function encodeBase64(value: unknown): string {
  return btoa(JSON.stringify(value));
}

function decodeBase64(value: string): string {
  return atob(value);
}
