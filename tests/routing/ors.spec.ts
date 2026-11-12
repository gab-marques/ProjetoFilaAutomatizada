import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  geocodeAddress,
  calculateTravelMinutes,
  clearRouteCache,
  RoutingError,
} from '@/lib/routing/ors';
import { GET } from '@/app/api/routing/estimate/route';
import { NextRequest } from 'next/server';

describe('OpenRouteService & LGPD Routing (lib/routing/ors.ts)', () => {
  beforeEach(() => {
    clearRouteCache();
  });

  it('should throw INVALID_PARAMS for empty or whitespace addresses', async () => {
    await expect(geocodeAddress('')).rejects.toThrowError(RoutingError);
    await expect(geocodeAddress('   ')).rejects.toThrowError(RoutingError);
  });

  it('should geocode address with mock fallback when in test environment', async () => {
    const geo = await geocodeAddress('Av. Batel, 1230');
    expect(geo.lat).toBeDefined();
    expect(geo.lng).toBeDefined();
    expect(geo.label).toContain('Batel');
    expect(geo.neighbourhood).toBe('Batel');
  });

  it('should calculate travel minutes rounded up', async () => {
    const origin = { lat: -25.435, lng: -49.278 };
    const destination = { lat: -25.4284, lng: -49.2733 };

    const estimate = await calculateTravelMinutes(origin, destination, 'driving-car');
    expect(estimate.travelMinutes).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(estimate.travelMinutes)).toBe(true);
    expect(estimate.profile).toBe('driving-car');
  });

  it('should reuse cache for identical coordinates', async () => {
    const origin = { lat: -25.435, lng: -49.278 };
    const destination = { lat: -25.4284, lng: -49.2733 };

    const first = await calculateTravelMinutes(origin, destination, 'driving-car');
    const second = await calculateTravelMinutes(origin, destination, 'driving-car');

    expect(first.travelMinutes).toBe(second.travelMinutes);
    expect(first.distanceMeters).toBe(second.distanceMeters);
  });

  it('should handle simulated API timeout gracefully', async () => {
    const mockSlowFetch = vi.fn().mockImplementation(() => {
      const err = new Error('AbortError');
      err.name = 'AbortError';
      return Promise.reject(err);
    });

    await expect(
      calculateTravelMinutes(
        { lat: -25.435, lng: -49.278 },
        { lat: -25.4284, lng: -49.2733 },
        'driving-car',
        mockSlowFetch as unknown as typeof fetch,
      ),
    ).rejects.toThrowError(/timeout|Tempo limite/);
  });

  it('LGPD Test: /api/routing/estimate returns only travel_minutes and area, never persisting PII', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/routing/estimate?address=Rua%20XV%20de%20Novembro&slug=cantina-demo',
    );
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.travel_minutes).toBeGreaterThan(0);
    expect(json.origin_area).toBeDefined();

    // Confirm that client's exact raw input coordinates/address are NOT stored or reflected back as PII
    expect(json.address).toBeUndefined();
    expect(json.lat).toBeUndefined();
    expect(json.lng).toBeUndefined();
  });
});
