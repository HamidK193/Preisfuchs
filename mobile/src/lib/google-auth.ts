import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '@/constants/app';
import { supabase } from '@/lib/supabase';

// Natives Google-Fenster gibt es nur im eigenen Build; in Expo Go (und als Rueckfall)
// meldet sich der Nutzer im Browser an (OAuth mit PKCE ueber Supabase).
const nativeGoogleAvailable =
  Platform.OS !== 'web' &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient &&
  (Platform.OS !== 'ios' || GOOGLE_IOS_CLIENT_ID !== undefined);

// Ziel nach der Browser-Anmeldung (muss in Supabase unter Redirect URLs erlaubt sein).
export const authRedirectUrl = Linking.createURL('auth/callback');

async function signInNative(): Promise<'ok' | 'cancelled'> {
  // Erst hier laden, damit Expo Go ohne das native Modul startet.
  const { GoogleSignin, isSuccessResponse } = await import('@react-native-google-signin/google-signin');
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, iosClientId: GOOGLE_IOS_CLIENT_ID });
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return 'cancelled';
  const token = response.data.idToken;
  if (!token) throw new Error('no id token');
  const { error } = await supabase!.auth.signInWithIdToken({ provider: 'google', token });
  if (error) throw error;
  return 'ok';
}

async function signInWithBrowser(): Promise<'ok' | 'cancelled'> {
  const { data, error } = await supabase!.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: authRedirectUrl, skipBrowserRedirect: true },
  });
  if (error) throw error;
  const result = await WebBrowser.openAuthSessionAsync(data.url, authRedirectUrl);
  if (result.type !== 'success') return 'cancelled';
  await completeAuthFromUrl(result.url);
  return 'ok';
}

// Uebernimmt den Anmelde-Code aus der Rueckleitungs-Adresse.
export async function completeAuthFromUrl(url: string): Promise<void> {
  const { queryParams } = Linking.parse(url);
  const errorText = queryParams?.error_description ?? queryParams?.error;
  if (errorText) throw new Error(String(errorText));
  const code = queryParams?.code;
  if (typeof code !== 'string') throw new Error('no auth code');
  const { error } = await supabase!.auth.exchangeCodeForSession(code);
  if (error) throw error;
}

// Meldet mit dem Google-Konto an; 'cancelled', wenn der Nutzer abbricht.
export async function signInWithGoogle(): Promise<'ok' | 'cancelled'> {
  if (!supabase) throw new Error('not configured');
  return nativeGoogleAvailable ? signInNative() : signInWithBrowser();
}
