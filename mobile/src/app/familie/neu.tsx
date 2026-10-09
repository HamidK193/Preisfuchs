import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { inputStyle, Page, PrimaryButton } from '@/components/settings';
import { AppText } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import { familyErrorText, KIND_LABELS, type HouseholdKind } from '@/lib/family';
import { useFamily } from '@/state/family-state';

const KINDS: { kind: HouseholdKind; emoji: string }[] = [
  { kind: 'familie', emoji: '🏠' },
  { kind: 'wg', emoji: '🛋️' },
  { kind: 'freunde', emoji: '🎉' },
];

// Gruppe erstellen: Typ, Name, eigener Anzeigename.
export default function NewGroupScreen() {
  const { createGroup, session } = useFamily();
  const [kind, setKind] = useState<HouseholdKind>('familie');
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState(session?.user.email?.split('@')[0] ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const emoji = KINDS.find((item) => item.kind === kind)!.emoji;

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const id = await createGroup(name.trim(), kind, emoji, displayName.trim());
      router.replace({ pathname: '/familie/[id]', params: { id } });
    } catch (failure) {
      setError(familyErrorText(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        {KINDS.map((item) => (
          <Pressable
            key={item.kind}
            onPress={() => setKind(item.kind)}
            accessibilityState={{ selected: item.kind === kind }}
            style={{
              flex: 1,
              alignItems: 'center',
              gap: 4,
              paddingVertical: Inset.card,
              borderRadius: Radius.large,
              borderWidth: 2,
              borderColor: item.kind === kind ? Colors.primary : Colors.border,
              backgroundColor: item.kind === kind ? Colors.primarySoft : Colors.card,
            }}>
            <AppText size={28}>{item.emoji}</AppText>
            <AppText weight="bold" size={14}>
              {KIND_LABELS[item.kind]}
            </AppText>
          </Pressable>
        ))}
      </View>

      <View style={{ gap: Spacing.two }}>
        <AppText weight="bold" size={13} color={Colors.textSecondary}>
          NAME DER GRUPPE
        </AppText>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={kind === 'familie' ? 'z. B. Familie Müller' : kind === 'wg' ? 'z. B. WG Gartenstraße' : 'z. B. Grillabend'}
          placeholderTextColor={Colors.textSecondary}
          maxLength={40}
          style={inputStyle}
        />
      </View>

      <View style={{ gap: Spacing.two }}>
        <AppText weight="bold" size={13} color={Colors.textSecondary}>
          DEIN NAME IN DER GRUPPE
        </AppText>
        <TextInput value={displayName} onChangeText={setDisplayName} placeholder="z. B. Anna" placeholderTextColor={Colors.textSecondary} maxLength={30} style={inputStyle} />
      </View>

      {error ? (
        <AppText size={13} color={Colors.danger}>
          {error}
        </AppText>
      ) : null}
      <PrimaryButton
        label={busy ? 'Wird erstellt …' : 'Gruppe erstellen'}
        disabled={busy || name.trim().length === 0 || displayName.trim().length === 0}
        onPress={submit}
      />
    </Page>
  );
}
