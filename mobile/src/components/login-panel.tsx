import { useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import { inputStyle, PrimaryButton } from '@/components/settings';
import { AppText } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { signInWithGoogle } from '@/lib/google-auth';
import { useFamily } from '@/state/family-state';

const CODE_LENGTH = 6;

// Anmeldung wie in gaengigen Apps: zuerst Google, darunter E-Mail mit Einmal-Code.
// Wird im Onboarding und im Konto-Sheet verwendet.
export function LoginPanel() {
  const { available, sendCode, verifyCode } = useFamily();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'start' | 'code'>('start');
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

  if (!available) {
    return (
      <AppText size={14} color={Colors.warning} style={{ textAlign: 'center' }}>
        Anmelden ist in dieser Version nicht verfügbar (kein Server konfiguriert).
      </AppText>
    );
  }

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <View style={{ gap: Spacing.three }}>
      {step === 'start' ? (
        <>
          <Pressable
            disabled={busy}
            accessibilityRole="button"
            onPress={() => run(async () => void (await signInWithGoogle()), 'Die Anmeldung mit Google hat nicht geklappt.')}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: Spacing.three,
              height: 54,
              borderRadius: Radius.medium,
              borderWidth: 1,
              borderColor: Colors.border,
              backgroundColor: pressed ? Colors.tile : Colors.card,
            })}>
            <AppText weight="extrabold" size={20} color="#4285F4">
              G
            </AppText>
            <AppText weight="bold" size={16}>
              Mit Google fortfahren
            </AppText>
          </Pressable>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
            <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
            <AppText size={13} color={Colors.textSecondary}>
              oder mit E-Mail
            </AppText>
            <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
          </View>

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
        </>
      ) : (
        <>
          <AppText size={14} color={Colors.textSecondary}>
            Wir haben einen {CODE_LENGTH}-stelligen Code an {email.trim()} geschickt. Schau auch im Spam-Ordner nach.
          </AppText>
          <TextInput
            value={code}
            onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, CODE_LENGTH))}
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
            disabled={code.length !== CODE_LENGTH || busy}
            onPress={() => run(() => verifyCode(email, code), 'Der Code stimmt nicht oder ist abgelaufen.')}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Pressable onPress={() => setStep('start')} hitSlop={8}>
              <AppText weight="bold" size={14} color={Colors.primary}>
                Andere Adresse
              </AppText>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() => run(() => sendCode(email), 'Der Code konnte nicht erneut gesendet werden. Warte kurz und versuch es noch einmal.')}
              hitSlop={8}>
              <AppText weight="bold" size={14} color={Colors.primary}>
                Code erneut senden
              </AppText>
            </Pressable>
          </View>
        </>
      )}

      {busy ? <ActivityIndicator color={Colors.primary} /> : null}
      {error ? (
        <AppText size={13} color={Colors.danger} style={{ textAlign: 'center' }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
