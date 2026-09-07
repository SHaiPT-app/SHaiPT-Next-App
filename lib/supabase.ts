import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

// Lazy initialization to prevent build-time errors when env vars aren't available.
// In the browser the client comes from @supabase/ssr so the session is stored in cookies:
// proxy.ts reads those cookies to keep signed-out visitors off the app pages.
let _supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
    if (_supabase) return _supabase;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error(
            'Missing Supabase environment variables. ' +
            'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
        );
    }

    _supabase = typeof window === 'undefined'
        ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
        : createBrowserClient(supabaseUrl, supabaseKey);
    return _supabase;
}

// Export a proxy that lazily initializes the client on first use
export const supabase = new Proxy({} as SupabaseClient, {
    get(_, prop) {
        const client = getSupabaseClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const value = (client as any)[prop];
        return typeof value === 'function' ? value.bind(client) : value;
    }
});
