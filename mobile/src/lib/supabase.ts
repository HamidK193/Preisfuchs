import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';
import { AppState, Platform } from 'react-native';

// React Native hat kein WebCrypto. Supabase braucht SHA-256 fuer PKCE (Google-Anmeldung im
// Browser); ohne das faellt es auf das schwaechere "plain"-Verfahren zurueck.
if (Platform.OS !== 'web' && !globalThis.crypto?.subtle) {
  const subtle = { digest: (algorithm: string, data: BufferSource) => Crypto.digest(algorithm as Crypto.CryptoDigestAlgorithm, data) };
  globalThis.crypto = {
    ...globalThis.crypto,
    getRandomValues: Crypto.getRandomValues,
    subtle,
  } as unknown as typeof globalThis.crypto;
}

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
          // PKCE fuer die Google-Anmeldung im Browser (Code statt Token in der Rueckleitung).
          flowType: 'pkce',
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
