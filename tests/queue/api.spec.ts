import { describe, it, expect } from 'vitest';
import { POST, GET } from '@/app/api/queue/route';
import { PATCH } from '@/app/api/queue/[id]/status/route';
import { NextRequest } from 'next/server';

describe('Queue API (/api/queue)', () => {
  it('should reject entry when LGPD consent is false or missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/queue', {
      method: 'POST',
      body: JSON.stringify({
        restaurant_slug: 'cantina-demo',
        display_name: 'Carlos',
        party_size: 4,
        consent: false,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it('should create queue entry and return link_token and redirect_url', async () => {
    const req = new NextRequest('http://localhost:3000/api/queue', {
      method: 'POST',
      body: JSON.stringify({
        restaurant_slug: 'cantina-demo',
        display_name: 'Gabriela',
        party_size: 2,
        travel_mode: 'driving-car',
        travel_minutes: 15,
        origin_area: 'Batel',
        consent: true,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.link_token).toBeDefined();
    expect(json.redirect_url).toContain('/r/cantina-demo/e/');
    expect(json.entry.display_name).toBe('Gabriela');
    expect(json.entry.travel_minutes).toBe(15);
    expect(json.entry.origin_area).toBe('Batel');

    // Strict LGPD Verification: confirm that NO street address or lat/lng exists in saved entry
    expect((json.entry as Record<string, unknown>).address).toBeUndefined();
    expect((json.entry as Record<string, unknown>).street).toBeUndefined();
    expect((json.entry as Record<string, unknown>).lat).toBeUndefined();
    expect((json.entry as Record<string, unknown>).lng).toBeUndefined();
  });

  it('should query queue status using link_token', async () => {
    // 1. Create an entry
    const postReq = new NextRequest('http://localhost:3000/api/queue', {
      method: 'POST',
      body: JSON.stringify({
        restaurant_slug: 'cantina-demo',
        display_name: 'Roberto',
        party_size: 4,
        consent: true,
      }),
    });
    const postRes = await POST(postReq);
    const postJson = await postRes.json();
    const token = postJson.link_token;

    // 2. Fetch using GET
    const getReq = new NextRequest(`http://localhost:3000/api/queue?token=${token}`);
    const getRes = await GET(getReq);
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json();
    expect(getJson.ok).toBe(true);
    expect(getJson.entry.display_name).toBe('Roberto');
    expect(getJson.position).toBeGreaterThanOrEqual(1);
  });

  it('should update queue entry status to seated via PATCH', async () => {
    // Create entry
    const postReq = new NextRequest('http://localhost:3000/api/queue', {
      method: 'POST',
      body: JSON.stringify({
        restaurant_slug: 'cantina-demo',
        display_name: 'Ana',
        party_size: 2,
        consent: true,
      }),
    });
    const postRes = await POST(postReq);
    const postJson = await postRes.json();
    const entryId = postJson.entry.id;

    // Update status to seated
    const patchReq = new NextRequest(`http://localhost:3000/api/queue/${entryId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'seated' }),
    });
    const patchRes = await PATCH(patchReq, { params: { id: entryId } });
    expect(patchRes.status).toBe(200);
    const patchJson = await patchRes.json();
    expect(patchJson.ok).toBe(true);
    expect(patchJson.entry.status).toBe('seated');
    expect(patchJson.entry.seated_at).toBeDefined();
  });
});
