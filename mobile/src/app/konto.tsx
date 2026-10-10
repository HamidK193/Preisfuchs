import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { LoginPanel } from '@/components/login-panel';
import { PrimaryButton, SecondaryButton } from '@/components/settings';
import { SheetScroll } from '@/components/sheet';
import { AppText, FoxLogo } from '@/components/ui';
import { Colors, Inset, Spacing } from '@/constants/theme';
import { useFamily } from '@/state/family-state';

// Konto: anmelden (Google oder E-Mail-Code), abmelden, loeschen. Nur fuer Familie & Gruppen noetig.
export default function AccountSheet() {
  const { session, signOut, deleteAccount } = useFamily();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const run = async (action: () => Promise<void>, failText: string) => {
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch {
      setError(failText);
    } finally {
      setBusy(false);
    }
  };

  if (session) {
    return (
      <SheetScroll contentContainerStyle={{ padding: Spacing.five, paddingTop: Spacing.six, gap: Spacing.four }}>
        <View style={{ alignItems: 'center', gap: Spacing.three }}>
          <FoxLogo size={72} />
          <AppText weight="extrabold" size={22}>
            Angemeldet
          </AppText>
          <AppText size={15} color={Colors.textSecondary}>
            {session.user.email}
          </AppText>
        </View>
        <PrimaryButton label="Familie & Gruppen" onPress={() => router.replace('/familie')} />
        <SecondaryButton label={busy ? 'Bitte warten …' : 'Abmelden'} onPress={() => run(signOut, 'Abmelden hat nicht geklappt.')} />
        <AppText size={12} color={Colors.textSecondary} style={{ textAlign: 'center' }}>
          Nach dem Abmelden bleiben deine Listen auf diesem Gerät, werden aber nicht mehr abgeglichen.
        </AppText>
        <Pressable
          onPress={() =>
            Alert.alert('Konto löschen?', 'Du verlässt alle Gruppen, und dein Konto wird endgültig gelöscht. Deine Listen bleiben auf diesem Gerät.', [
              { text: 'Abbrechen', style: 'cancel' },
              { text: 'Löschen', style: 'destructive', onPress: () => run(deleteAccount, 'Das Konto konnte nicht gelöscht werden.') },
            ])
          }
          style={{ alignItems: 'center', paddingVertical: Inset.compact }}>
          <AppText weight="bold" size={14} color={Colors.danger}>
            Konto löschen
          </AppText>
        </Pressable>
        {error ? (
          <AppText size={13} color={Colors.danger} style={{ textAlign: 'center' }}>
            {error}
          </AppText>
        ) : null}
      </SheetScroll>
    );
  }

  return (
    <SheetScroll contentContainerStyle={{ padding: Spacing.five, paddingTop: Spacing.six, gap: Spacing.four }} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center', gap: Spacing.three }}>
        <FoxLogo size={80} />
        <AppText weight="extrabold" size={24}>
          Gemeinsam einkaufen
        </AppText>
        <AppText size={15} color={Colors.textSecondary} style={{ textAlign: 'center' }}>
          Ein Konto brauchst du nur, um Listen mit Familie oder Freunden live zu teilen. Alles andere geht ohne.
        </AppText>
      </View>

      <LoginPanel />

      <AppText size={12} color={Colors.textSecondary} style={{ textAlign: 'center' }}>
        Gespeichert werden deine E-Mail-Adresse, dein Anzeigename in Gruppen und die geteilten Listen.
      </AppText>

      <Pressable onPress={() => router.back()} style={{ alignItems: 'center', paddingVertical: Inset.compact }}>
        <AppText weight="bold" size={15} color={Colors.textSecondary}>
          Später
        </AppText>
      </Pressable>
    </SheetScroll>
  );
}
