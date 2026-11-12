import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress, calculateTravelMinutes, TravelProfile } from '@/lib/routing/ors';
import { getRestaurantBySlug } from '@/lib/queue/store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');
  const slug = searchParams.get('slug') || 'cantina-demo';
  const mode = (searchParams.get('mode') as TravelProfile) || 'driving-car';
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');

  try {
    const restaurant = await getRestaurantBySlug(slug);
    if (!restaurant) {
      return NextResponse.json({ ok: false, error: 'Restaurante não encontrado' }, { status: 404 });
    }

    let originCoords: { lat: number; lng: number };
    let neighbourhood: string | undefined;

    if (latParam && lngParam) {
      originCoords = { lat: parseFloat(latParam), lng: parseFloat(lngParam) };
    } else if (address) {
      const geo = await geocodeAddress(address, restaurant.lat, restaurant.lng);
      originCoords = { lat: geo.lat, lng: geo.lng };
      neighbourhood = geo.neighbourhood;
    } else {
      return NextResponse.json(
        { ok: false, error: 'Informe um endereço ou coordenadas' },
        { status: 400 },
      );
    }

    const estimate = await calculateTravelMinutes(
      originCoords,
      { lat: restaurant.lat, lng: restaurant.lng },
      mode,
    );

    // Return calculated minutes and neighbourhood, discarding raw coordinates
    return NextResponse.json({
      ok: true,
      travel_minutes: estimate.travelMinutes,
      distance_meters: estimate.distanceMeters,
      origin_area: neighbourhood || null,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
