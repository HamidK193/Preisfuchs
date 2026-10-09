import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/settings';
import { SheetScroll } from '@/components/sheet';
import { AppText } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import { useAppState } from '@/state/app-state';

const EMOJIS = ['🛒', '🎉', '🏠', '🥗', '🍝', '🧺', '👶', '🐶'];
const NAME_SUGGESTIONS = ['Wocheneinkauf', 'Party', 'WG', 'Grillen', 'Vorrat'];

// Neue Liste anlegen (ohne id) oder bestehende umbenennen bzw. loeschen.
export default function EditListScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { lists, createList, updateList, deleteList } = useAppState();
  const existing = lists.find((list) => list.id === id);
  const [name, setName] = useState(existing?.name ?? '');
  const [emoji, setEmoji] = useState(existing?.emoji ?? EMOJIS[0]);
  const clean = name.trim();

  const save = () => {
    if (existing) {
      updateList(existing.id, { name: clean, emoji });
    } else {
      createList(clean, emoji);
    }
    router.back();
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert(`„${existing.name}“ löschen?`, 'Die Liste und ihre Artikel werden von diesem Gerät entfernt.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => {
          deleteList(existing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <SheetScroll contentContainerStyle={{ padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.six }} keyboardShouldPersistTaps="handled">
      <AppText weight="extrabold" size={22}>
        {existing ? 'Liste bearbeiten' : 'Neue Liste'}
      </AppText>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Name der Liste"
        placeholderTextColor={Colors.textSecondary}
        autoFocus={!existing}
        maxLength={40}
        style={{
          borderWidth: 1,
          borderColor: Colors.border,
          borderRadius: Radius.medium,
          padding: Inset.compact,
          fontSize: 17,
          fontWeight: '600',
          color: Colors.text,
          backgroundColor: Colors.card,
        }}
      />

      {existing ? null : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
          {NAME_SUGGESTIONS.map((suggestion) => (
            <Pressable
              key={suggestion}
              onPress={() => setName(suggestion)}
              style={{ backgroundColor: Colors.tile, borderRadius: Radius.pill, paddingHorizontal: Inset.chipH, paddingVertical: Inset.chipV }}>
              <AppText weight="semibold" size={13}>
                {suggestion}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}

      <View style={{ gap: Spacing.two }}>
        <AppText weight="bold" size={13} color={Colors.textSecondary}>
          SYMBOL
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
          {EMOJIS.map((item) => (
            <Pressable
              key={item}
              onPress={() => setEmoji(item)}
              accessibilityState={{ selected: item === emoji }}
              style={{
                width: 48,
                height: 48,
                borderRadius: Radius.medium,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: item === emoji ? Colors.primary : Colors.border,
                backgroundColor: item === emoji ? Colors.primarySoft : Colors.card,
              }}>
              <AppText size={24}>{item}</AppText>
            </Pressable>
          ))}
        </View>
      </View>

      <PrimaryButton label={existing ? 'Speichern' : 'Liste anlegen'} onPress={save} disabled={clean.length === 0} />

      {existing && lists.length > 1 ? (
        <Pressable onPress={confirmDelete} style={{ alignItems: 'center', paddingVertical: Inset.compact }}>
          <AppText weight="bold" size={14} color={Colors.danger}>
            Liste löschen
          </AppText>
        </Pressable>
      ) : null}
    </SheetScroll>
  );
}
