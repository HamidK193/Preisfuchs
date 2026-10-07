import { createClient } from '@supabase/supabase-js';

// Nur oeffentliche Werte (URL und anon-Key, siehe mobile/.env.local). Nie den Service-Role-Key eintragen.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Ohne Konfiguration laeuft die App mit OpenStreetMap-Fallback und Demo-Preisen weiter.
export const supabase =
  url && anonKey ? createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
