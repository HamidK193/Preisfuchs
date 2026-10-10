import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '@/constants/app';
import { supabase } from '@/lib/supabase';

// Google-Anmeldung braucht ein natives Modul: nicht in Expo Go, nur im eigenen Build.
export const googleSignInAvailable =
  supabase !== null &&
  Platform.OS !== 'web' &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient &&
  (Platform.OS !== 'ios' || GOOGLE_IOS_CLIENT_ID !== undefined);

// Meldet mit dem Google-Konto an; 'cancelled', wenn der Nutzer abbricht.
export async function signInWithGoogle(): Promise<'ok' | 'cancelled'> {
  if (!supabase) throw new Error('not configured');
  // Erst hier laden, damit Expo Go ohne das native Modul startet.
  const { GoogleSignin, isSuccessResponse } = await import('@react-native-google-signin/google-signin');
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, iosClientId: GOOGLE_IOS_CLIENT_ID });
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return 'cancelled';
  const token = response.data.idToken;
  if (!token) throw new Error('no id token');
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token });
  if (error) throw error;
  return 'ok';
}
