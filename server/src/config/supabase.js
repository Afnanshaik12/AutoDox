import './env.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || supabaseAnonKey;

let supabase = null;
let supabaseAdmin = null;
let isConfigured = false;

if (supabaseUrl && (supabaseAnonKey || supabaseServiceKey)) {
  try {
    const key = supabaseAnonKey || supabaseServiceKey;
    supabase = createClient(supabaseUrl, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    if (supabaseServiceKey) {
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
    } else {
      supabaseAdmin = supabase;
    }

    isConfigured = true;
    console.log('[AutoDox Supabase] ✅ Supabase client initialized successfully.');
  } catch (err) {
    console.error(`[AutoDox Supabase] ⚠️ Initialization error: ${err.message}`);
    supabase = null;
    supabaseAdmin = null;
    isConfigured = false;
  }
} else {
  console.log('[AutoDox Supabase] ℹ️  Notice: SUPABASE_URL / SUPABASE_ANON_KEY not configured in server/.env');
}

/**
 * Main Supabase client for client-level auth operations
 */
export function getSupabaseClient() {
  return supabase;
}

/**
 * Elevated Supabase client using Service Role key
 */
export function getSupabaseAdminClient() {
  return supabaseAdmin || supabase;
}

/**
 * Creates a scoped Supabase client authenticated as a specific user.
 * This directly enforces PostgreSQL Row Level Security (RLS) policies for that user.
 */
export function createScopedUserClient(accessToken) {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

/**
 * Returns current configuration status
 */
export function getSupabaseStatus() {
  return {
    isConfigured,
    hasServiceKey: Boolean(supabaseServiceKey),
    supabaseUrl: supabaseUrl ? supabaseUrl.replace(/^(https?:\/\/[^/]+).*$/, '$1') : null
  };
}
