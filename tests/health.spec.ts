import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/health/route';

describe('Health API (GET /api/health)', () => {
  it('should return 200 with ok: true and valid timestamp', async () => {
    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.service).toBe('fila-inteligente');
    expect(json.timestamp).toBeDefined();
    expect(new Date(json.timestamp).getTime()).not.toBeNaN();
  });
});
