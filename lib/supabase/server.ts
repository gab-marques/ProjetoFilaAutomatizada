import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

export function createServerClient(useServiceRole = false) {
  const key = useServiceRole
    ? env.SUPABASE_SERVICE_ROLE_KEY
    : env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const supabaseServer = createServerClient(false);
export const supabaseAdmin = createServerClient(true);
