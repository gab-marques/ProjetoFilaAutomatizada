import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { env } from '@/lib/env';

// Polyfill WebSocket for Node.js < 22 environments
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;
}

export function createServerClient(useServiceRole = false) {
  const key = useServiceRole
    ? env.SUPABASE_SERVICE_ROLE_KEY
    : env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      // @ts-expect-error WebSocket transport for Node 20
      transport: WebSocket,
    },
  });
}

export const supabaseServer = createServerClient(false);
export const supabaseAdmin = createServerClient(true);
