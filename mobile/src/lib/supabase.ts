import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// Nur oeffentliche Werte (URL und anon-Key, siehe mobile/.env.local). Nie den Service-Role-Key eintragen.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Ohne Konfiguration laeuft die App mit OpenStreetMap-Fallback und Demo-Preisen weiter.
// Die Anmeldung (nur fuer Familie & Gruppen) bleibt auf dem Geraet gespeichert.
export const supabase =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          storage: Platform.OS === 'web' && typeof window === 'undefined' ? undefined : AsyncStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;

// Token nur erneuern, solange die App im Vordergrund ist.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
