import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { SheetScroll } from '@/components/sheet';
import { AppText, Icon } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import { useAppState } from '@/state/app-state';

// Meine Listen: zwischen Einkaufslisten wechseln, neue anlegen, bearbeiten, teilen.
export default function ListsScreen() {
  const { lists, activeListId, setActiveList } = useAppState();

  return (
    <SheetScroll contentContainerStyle={{ padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six }}>
      <AppText weight="extrabold" size={22}>
        Meine Listen
      </AppText>
      <AppText size={13} color={Colors.textSecondary}>
        Der Warenkorb zeigt immer die ausgewählte Liste. Listen bleiben auf diesem Gerät gespeichert.
      </AppText>

      {lists.map((list) => {
        const active = list.id === activeListId;
        const count = list.lines.reduce((sum, line) => sum + line.quantity, 0);
        return (
          <View
            key={list.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.three,
              padding: Inset.row,
              borderRadius: Radius.large,
              borderWidth: 1.5,
              borderColor: active ? Colors.primary : Colors.border,
              backgroundColor: active ? Colors.primarySoft : Colors.card,
            }}>
            <Pressable
              onPress={() => {
                setActiveList(list.id);
                router.back();
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
              <AppText size={28}>{list.emoji}</AppText>
              <View style={{ flex: 1 }}>
                <AppText weight="bold" size={16} numberOfLines={1}>
                  {list.name}
                </AppText>
                <AppText size={12} color={Colors.textSecondary}>
                  {count === 1 ? '1 Artikel' : `${count} Artikel`}
                  {active ? ' · ausgewählt' : ''}
                </AppText>
              </View>
            </Pressable>
            <Pressable
              onPress={() => router.push({ pathname: '/liste-teilen/[id]', params: { id: list.id } })}
              hitSlop={8}
              accessibilityLabel={`${list.name} teilen`}>
              <Icon name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }} size={20} color={Colors.primary} />
            </Pressable>
            <Pressable
              onPress={() => router.push({ pathname: '/liste-bearbeiten', params: { id: list.id } })}
              hitSlop={8}
              accessibilityLabel={`${list.name} bearbeiten`}>
              <Icon name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>
        );
      })}

      <Pressable
        onPress={() => router.push('/liste-bearbeiten')}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: Spacing.two,
          borderRadius: Radius.pill,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: Colors.primary,
          paddingVertical: Inset.buttonV,
          backgroundColor: pressed ? Colors.primarySoft : Colors.card,
        })}>
        <Icon name={{ ios: 'plus', android: 'add', web: 'add' }} size={16} color={Colors.primary} />
        <AppText weight="bold" size={15} color={Colors.primary}>
          Neue Liste
        </AppText>
      </Pressable>
    </SheetScroll>
  );
}
