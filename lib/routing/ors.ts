import { env } from '@/lib/env';

export interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
  neighbourhood?: string;
}

export type TravelProfile = 'driving-car' | 'foot-walking';

export interface TravelEstimate {
  travelMinutes: number;
  distanceMeters: number;
  profile: TravelProfile;
  originArea?: string;
}

// In-memory cache: key -> { estimate: TravelEstimate, timestamp: number }
const routeCache = new Map<string, { estimate: TravelEstimate; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCacheKey(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  profile: TravelProfile,
): string {
  // Round to 3 decimal places (~110 meters) to maximize cache hits
  const oLat = originLat.toFixed(3);
  const oLng = originLng.toFixed(3);
  const dLat = destLat.toFixed(3);
  const dLng = destLng.toFixed(3);
  return `${profile}:${oLat},${oLng}->${dLat},${dLng}`;
}

export class RoutingError extends Error {
  constructor(
    message: string,
    public code: 'TIMEOUT' | 'NOT_FOUND' | 'API_ERROR' | 'INVALID_PARAMS',
  ) {
    super(message);
    this.name = 'RoutingError';
  }
}

/**
 * Geocodes an address string using OpenRouteService /geocode/search
 * Restricts search to Brazil and focuses near restaurant coordinates.
 */
export async function geocodeAddress(
  address: string,
  focusLat = -25.4284,
  focusLng = -49.2733,
  fetchFn = fetch,
): Promise<GeocodeResult> {
  const apiKey = env.ORS_API_KEY;
  if (!address || address.trim().length < 3) {
    throw new RoutingError('Endereço muito curto ou inválido', 'INVALID_PARAMS');
  }

  // Fallback for mock ORS key in dev/test when standard fetch is used
  if (fetchFn === fetch && (!apiKey || apiKey.includes('mock'))) {
    return {
      lat: focusLat + 0.015,
      lng: focusLng + 0.015,
      label: `${address.trim()}, Curitiba - PR`,
      neighbourhood: 'Batel',
    };
  }

  const url = new URL('https://api.openrouteservice.org/geocode/search');
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('text', address);
  url.searchParams.set('boundary.country', 'BR');
  url.searchParams.set('focus.point.lat', focusLat.toString());
  url.searchParams.set('focus.point.lon', focusLng.toString());
  url.searchParams.set('size', '1');

  let attempt = 0;
  const maxRetries = 1;
  const timeoutMs = 8000;

  while (attempt <= maxRetries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetchFn(url.toString(), {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new RoutingError(`ORS Geocode error: HTTP ${res.status}`, 'API_ERROR');
      }

      const json = await res.json();
      const features = json.features;
      if (!features || features.length === 0) {
        throw new RoutingError('Endereço não encontrado pelo serviço de rotas', 'NOT_FOUND');
      }

      const first = features[0];
      const coords = first.geometry.coordinates; // [lon, lat]
      const props = first.properties || {};

      return {
        lat: coords[1],
        lng: coords[0],
        label: props.label || address,
        neighbourhood: props.neighbourhood || props.locality || undefined,
      };
    } catch (err: unknown) {
      attempt++;
      if (err instanceof RoutingError && err.code === 'NOT_FOUND') {
        throw err;
      }
      if (attempt > maxRetries) {
        if ((err as Error)?.name === 'AbortError') {
          throw new RoutingError('Tempo limite excedido ao buscar endereço (timeout)', 'TIMEOUT');
        }
        throw new RoutingError(`Falha na geocodificação: ${(err as Error).message}`, 'API_ERROR');
      }
      await new Promise((r) => setTimeout(r, 200 * attempt));
    }
  }

  throw new RoutingError('Falha inesperada no serviço de geocodificação', 'API_ERROR');
}

/**
 * Calculates travel duration between origin and destination using OpenRouteService Directions API.
 * Uses in-memory cache and rounds up duration in minutes.
 */
export async function calculateTravelMinutes(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  profile: TravelProfile = 'driving-car',
  fetchFn = fetch,
): Promise<TravelEstimate> {
  const cacheKey = getCacheKey(origin.lat, origin.lng, destination.lat, destination.lng, profile);
  const cached = routeCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.estimate;
  }

  const apiKey = env.ORS_API_KEY;

  // Fallback for mock ORS key in dev/test when standard fetch is used
  if (fetchFn === fetch && (!apiKey || apiKey.includes('mock'))) {
    // Approximate distance via Euclidean approximation
    const dLat = (destination.lat - origin.lat) * 111000;
    const dLng = (destination.lng - origin.lng) * 111000 * Math.cos((origin.lat * Math.PI) / 180);
    const distanceMeters = Math.round(Math.sqrt(dLat * dLat + dLng * dLng));
    const speedMps = profile === 'driving-car' ? 8.33 : 1.38; // ~30 km/h car, ~5 km/h walking
    const travelMinutes = Math.max(1, Math.ceil(distanceMeters / speedMps / 60));

    const estimate: TravelEstimate = {
      travelMinutes,
      distanceMeters,
      profile,
    };
    routeCache.set(cacheKey, { estimate, timestamp: Date.now() });
    return estimate;
  }

  const url = `https://api.openrouteservice.org/v2/directions/${profile}?api_key=${apiKey}&start=${origin.lng},${origin.lat}&end=${destination.lng},${destination.lat}`;

  let attempt = 0;
  const maxRetries = 1;
  const timeoutMs = 8000;

  while (attempt <= maxRetries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetchFn(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new RoutingError(`ORS Directions error: HTTP ${res.status}`, 'API_ERROR');
      }

      const json = await res.json();
      const feature = json.features?.[0];
      if (!feature) {
        throw new RoutingError('Rota não encontrada entre os pontos', 'NOT_FOUND');
      }

      const summary = feature.properties?.summary;
      const durationSeconds = summary?.duration || 600;
      const distanceMeters = Math.round(summary?.distance || 3000);
      const travelMinutes = Math.max(1, Math.ceil(durationSeconds / 60));

      const estimate: TravelEstimate = {
        travelMinutes,
        distanceMeters,
        profile,
      };

      routeCache.set(cacheKey, { estimate, timestamp: Date.now() });
      return estimate;
    } catch (err: unknown) {
      attempt++;
      if (attempt > maxRetries) {
        if ((err as Error)?.name === 'AbortError') {
          throw new RoutingError('Tempo limite excedido ao calcular rota (timeout)', 'TIMEOUT');
        }
        throw new RoutingError(`Falha no cálculo de rota: ${(err as Error).message}`, 'API_ERROR');
      }
      await new Promise((r) => setTimeout(r, 200 * attempt));
    }
  }

  throw new RoutingError('Falha inesperada no cálculo de trajeto', 'API_ERROR');
}

/**
 * Clears the routing cache (useful in tests).
 */
export function clearRouteCache() {
  routeCache.clear();
}
