import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, TextInput, View } from 'react-native';

import { inputStyle, PrimaryButton, SecondaryButton } from '@/components/settings';
import { SheetScroll } from '@/components/sheet';
import { AppText, FoxLogo } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import { googleSignInAvailable, signInWithGoogle } from '@/lib/google-auth';
import { useFamily } from '@/state/family-state';

// Anmelden per E-Mail-Code. Ein Konto braucht man nur fuer Familie & Gruppen.
export default function AccountSheet() {
  const { available, session, sendCode, verifyCode, signOut, deleteAccount } = useFamily();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
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
        <SecondaryButton label="Abmelden" onPress={() => run(signOut, 'Abmelden hat nicht geklappt.')} />
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

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

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

      {!available ? (
        <AppText size={14} color={Colors.warning} style={{ textAlign: 'center' }}>
          Anmelden ist in dieser Version nicht verfügbar (kein Server konfiguriert).
        </AppText>
      ) : step === 'email' ? (
        <View style={{ gap: Spacing.three }}>
          {googleSignInAvailable ? (
            <>
              <Pressable
                disabled={busy}
                onPress={() =>
                  run(async () => {
                    await signInWithGoogle();
                  }, 'Die Anmeldung mit Google hat nicht geklappt.')
                }
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: Spacing.two,
                  height: 52,
                  borderRadius: Radius.medium,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  backgroundColor: pressed ? Colors.tile : Colors.card,
                })}>
                <AppText weight="extrabold" size={18} color="#4285F4">
                  G
                </AppText>
                <AppText weight="bold" size={16}>
                  Mit Google anmelden
                </AppText>
              </Pressable>
              <AppText size={13} color={Colors.textSecondary} style={{ textAlign: 'center' }}>
                oder mit E-Mail-Code
              </AppText>
            </>
          ) : null}
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="E-Mail-Adresse"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            style={inputStyle}
          />
          <PrimaryButton
            label={busy ? 'Wird gesendet …' : 'Code per E-Mail senden'}
            disabled={!emailValid || busy}
            onPress={() =>
              run(async () => {
                await sendCode(email);
                setStep('code');
              }, 'Die E-Mail konnte nicht gesendet werden. Prüfe die Adresse oder versuch es später noch einmal.')
            }
          />
        </View>
      ) : (
        <View style={{ gap: Spacing.three }}>
          <AppText size={14} color={Colors.textSecondary}>
            Wir haben dir einen Code an {email.trim()} geschickt.
          </AppText>
          <TextInput
            value={code}
            onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 8))}
            placeholder="123456"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            autoFocus
            style={[inputStyle, { fontSize: 24, letterSpacing: 6, textAlign: 'center', fontWeight: '700' }]}
          />
          <PrimaryButton
            label={busy ? 'Wird geprüft …' : 'Anmelden'}
            disabled={code.length < 6 || busy}
            onPress={() => run(() => verifyCode(email, code), 'Der Code stimmt nicht oder ist abgelaufen.')}
          />
          <Pressable onPress={() => setStep('email')} style={{ alignItems: 'center' }}>
            <AppText weight="bold" size={14} color={Colors.primary}>
              Andere E-Mail-Adresse
            </AppText>
          </Pressable>
        </View>
      )}

      {busy ? <ActivityIndicator color={Colors.primary} /> : null}
      {error ? (
        <AppText size={13} color={Colors.danger} style={{ textAlign: 'center' }}>
          {error}
        </AppText>
      ) : null}

      <AppText size={12} color={Colors.textSecondary} style={{ textAlign: 'center' }}>
        Gespeichert werden deine E-Mail-Adresse, dein Anzeigename in Gruppen und die geteilten Listen.
        {googleSignInAvailable ? '' : ' Anmelden mit Google gibt es in der eigenen App-Version.'}
      </AppText>

      <Pressable onPress={() => router.back()} style={{ alignItems: 'center', paddingVertical: Inset.compact }}>
        <AppText weight="bold" size={15} color={Colors.textSecondary}>
          Später
        </AppText>
      </Pressable>
    </SheetScroll>
  );
}
