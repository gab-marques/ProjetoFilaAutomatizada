import { describe, it, expect } from 'vitest';
import { getEnv } from '@/lib/env';

describe('Environment Validation (lib/env.ts)', () => {
  it('should successfully parse valid environment variables', () => {
    const validConfig = {
      NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      GEMINI_API_KEY: 'test-gemini-key',
      GEMINI_MODEL: 'gemini-1.5-flash',
      ORS_API_KEY: 'test-ors-key',
      TELEGRAM_BOT_TOKEN: '123456:ABC-DEF',
      TELEGRAM_BOT_USERNAME: 'fila_bot',
      TELEGRAM_WEBHOOK_SECRET: 'super-secret',
      TICK_SECRET: 'tick-secret',
      APP_BASE_URL: 'https://fila.example.com',
      NEXT_PUBLIC_APP_URL: 'https://fila.example.com',
      DEFAULT_NOTIFY_MARGIN_MIN: '5',
      CONTACT_RETENTION_HOURS: '24',
      MINUTES_PER_MANUAL_CALL: '1.5',
      MINUTES_PER_STATUS_QUESTION: '1.0',
    };

    const parsed = getEnv(validConfig);
    expect(parsed.NEXT_PUBLIC_SUPABASE_URL).toBe('https://demo.supabase.co');
    expect(parsed.DEFAULT_NOTIFY_MARGIN_MIN).toBe(5);
    expect(parsed.CONTACT_RETENTION_HOURS).toBe(24);
  });

  it('should throw clear error when NEXT_PUBLIC_SUPABASE_URL is invalid or missing', () => {
    expect(() => {
      getEnv({
        NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
      });
    }).toThrowError(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it('should apply defaults for optional parameters', () => {
    const minimal = {
      NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    };

    const parsed = getEnv(minimal);
    expect(parsed.DEFAULT_NOTIFY_MARGIN_MIN).toBe(5);
    expect(parsed.CONTACT_RETENTION_HOURS).toBe(24);
    expect(parsed.GEMINI_MODEL).toBe('gemini-1.5-flash');
  });
});
