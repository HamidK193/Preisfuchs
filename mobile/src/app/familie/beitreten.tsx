import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { inputStyle, Page, PrimaryButton, SecondaryButton } from '@/components/settings';
import { AppText, Card } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { familyErrorText, KIND_LABELS, previewInvite, type InvitePreview } from '@/lib/family';
import { useFamily } from '@/state/family-state';

// Einladung annehmen: Code eingeben (oder per Link), Gruppe ansehen, beitreten.
export default function JoinGroupScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const { session, joinGroup } = useFamily();
  const [code, setCode] = useState((params.code ?? '').toUpperCase());
  const [displayName, setDisplayName] = useState(session?.user.email?.split('@')[0] ?? '');
  const [preview, setPreview] = useState<InvitePreview | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  if (!session) {
    return (
      <Page>
        <AppText size={15}>Zum Beitreten musst du angemeldet sein. Danach kannst du den Code hier eingeben.</AppText>
        <PrimaryButton label="Anmelden mit E-Mail" onPress={() => router.push('/konto')} />
      </Page>
    );
  }

  const check = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const found = await previewInvite(code);
      if (!found) setError('Der Code ist ungültig oder abgelaufen.');
      setPreview(found);
    } catch (failure) {
      setError(familyErrorText(failure));
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const id = await joinGroup(code, displayName.trim());
      router.replace({ pathname: '/familie/[id]', params: { id } });
    } catch (failure) {
      setError(familyErrorText(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <View style={{ gap: Spacing.two }}>
        <AppText weight="bold" size={13} color={Colors.textSecondary}>
          EINLADUNGSCODE
        </AppText>
        <TextInput
          value={code}
          onChangeText={(text) => {
            setCode(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8));
            setPreview(undefined);
          }}
          placeholder="ABCD2345"
          placeholderTextColor={Colors.textSecondary}
          autoCapitalize="characters"
          autoCorrect={false}
          style={[inputStyle, { fontSize: 22, letterSpacing: 4, fontWeight: '700', textAlign: 'center' }]}
        />
      </View>

      {preview ? (
        <>
          <Card style={{ gap: Spacing.one, alignItems: 'center' }}>
            <AppText size={36}>{preview.emoji}</AppText>
            <AppText weight="extrabold" size={19}>
              {preview.name}
            </AppText>
            <AppText size={13} color={Colors.textSecondary}>
              {KIND_LABELS[preview.kind]} · {preview.memberCount} {preview.memberCount === 1 ? 'Mitglied' : 'Mitglieder'}
            </AppText>
          </Card>
          <View style={{ gap: Spacing.two }}>
            <AppText weight="bold" size={13} color={Colors.textSecondary}>
              DEIN NAME IN DER GRUPPE
            </AppText>
            <TextInput value={displayName} onChangeText={setDisplayName} placeholder="z. B. Anna" placeholderTextColor={Colors.textSecondary} maxLength={30} style={inputStyle} />
          </View>
          <PrimaryButton label={busy ? 'Wird beigetreten …' : 'Beitreten'} disabled={busy || displayName.trim().length === 0} onPress={join} />
        </>
      ) : (
        <PrimaryButton label={busy ? 'Wird geprüft …' : 'Code prüfen'} disabled={busy || code.length !== 8} onPress={check} />
      )}

      {error ? (
        <AppText size={13} color={Colors.danger}>
          {error}
        </AppText>
      ) : null}
      <SecondaryButton label="Abbrechen" onPress={() => router.back()} />
    </Page>
  );
}
