import { z } from 'zod';

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL')
    .default('https://mock.supabase.co'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
    .default('mock-anon-key'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .default('mock-service-role-key'),

  // Gemini API
  GEMINI_API_KEY: z.string().default('mock-gemini-key'),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),

  // OpenRouteService
  ORS_API_KEY: z.string().default('mock-ors-key'),

  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().default('mock-bot-token'),
  TELEGRAM_BOT_USERNAME: z.string().default('mock_bot'),
  TELEGRAM_WEBHOOK_SECRET: z.string().default('mock-webhook-secret'),

  // Tick & Internal Secrets
  TICK_SECRET: z.string().default('mock-tick-secret'),

  // App URLs
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  APP_BASE_URL: z.string().default('http://localhost:3000'),

  // App Parameters
  DEFAULT_NOTIFY_MARGIN_MIN: z.coerce.number().int().positive().default(5),
  CONTACT_RETENTION_HOURS: z.coerce.number().int().positive().default(24),
  MINUTES_PER_MANUAL_CALL: z.coerce.number().positive().default(1.5),
  MINUTES_PER_STATUS_QUESTION: z.coerce.number().positive().default(1.0),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env | null = null;

export function getEnv(customEnv?: Record<string, string | undefined>): Env {
  if (customEnv) {
    const result = envSchema.safeParse(customEnv);
    if (!result.success) {
      const issues = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
      throw new Error(`Environment validation error:\n${issues}`);
    }
    return result.data;
  }

  if (!parsedEnv) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      const issues = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
      throw new Error(`Environment validation error:\n${issues}`);
    }
    parsedEnv = result.data;
  }

  return parsedEnv;
}

export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return getEnv()[prop as keyof Env];
  },
});
