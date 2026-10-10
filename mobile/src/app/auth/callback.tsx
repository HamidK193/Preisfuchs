import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import * as Linking from 'expo-linking';

import { Colors } from '@/constants/theme';
import { completeAuthFromUrl } from '@/lib/google-auth';

// Rueckleitung nach der Anmeldung im Browser, falls das System die App direkt oeffnet
// (sonst uebernimmt openAuthSessionAsync die Adresse). Danach zurueck zum Start.
export default function AuthCallbackScreen() {
  const url = Linking.useLinkingURL();

  useEffect(() => {
    if (!url) return;
    completeAuthFromUrl(url)
      .catch(() => undefined)
      .finally(() => router.replace('/'));
  }, [url]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
      <ActivityIndicator color={Colors.primary} />
    </View>
  );
}
