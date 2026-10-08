import { Modal, Pressable, ScrollView, View } from 'react-native';

import { Group, PrimaryButton, ToggleRow } from '@/components/settings';
import { AppText, Icon, StoreBadge } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import type { StoreId } from '@/data/stores';
import { useAppState } from '@/state/app-state';

export type SearchFilters = {
  sort: 'grundpreis' | 'preis' | 'rabatt';
  onlyDeals: boolean;
  onlyBio: boolean;
  // undefined = alle aktiven Maerkte
  storeIds: StoreId[] | undefined;
};

const SORT_OPTIONS: { key: SearchFilters['sort']; label: string; hint: string }[] = [
  { key: 'grundpreis', label: 'Grundpreis', hint: 'Preis pro kg, l oder Stück' },
  { key: 'preis', label: 'Preis', hint: 'Günstigster Packungspreis zuerst' },
  { key: 'rabatt', label: 'Rabatt', hint: 'Größte Ersparnis zuerst' },
];

type Props = {
  visible: boolean;
  filters: SearchFilters;
  resultCount: number;
  onChange: (filters: SearchFilters) => void;
  onReset: () => void;
  onClose: () => void;
};

// Filter und Sortierung der Suche als iOS-Sheet.
export function SearchFilterSheet({ visible, filters, resultCount, onChange, onReset, onClose }: Props) {
  const { stores, activeStoreIds } = useAppState();
  const activeStores = stores.filter((store) => activeStoreIds.includes(store.id));
  const selected = filters.storeIds ?? activeStoreIds;

  const toggleStore = (storeId: StoreId) => {
    const next = selected.includes(storeId) ? selected.filter((id) => id !== storeId) : [...selected, storeId];
    // Mindestens ein Markt; alle gewaehlt = kein Marktfilter.
    if (next.length === 0) return;
    onChange({ ...filters, storeIds: next.length === activeStoreIds.length ? undefined : next });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.four }}>
          <Pressable onPress={onReset} hitSlop={10}>
            <AppText weight="semibold" size={15} color={Colors.primary}>
              Zurücksetzen
            </AppText>
          </Pressable>
          <AppText weight="bold" size={17}>
            Filter & Sortierung
          </AppText>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Schließen">
            <Icon name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }} size={26} color={Colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: Spacing.four, gap: Spacing.five }}>
          <Group title="Sortieren nach">
            {SORT_OPTIONS.map((option, index) => {
              const active = filters.sort === option.key;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => onChange({ ...filters, sort: option.key })}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: Spacing.three,
                    padding: Inset.row,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: Colors.border,
                  }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText weight="semibold" size={15}>
                      {option.label}
                    </AppText>
                    <AppText size={12} color={Colors.textSecondary}>
                      {option.hint}
                    </AppText>
                  </View>
                  {active ? <Icon name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={17} color={Colors.primary} /> : null}
                </Pressable>
              );
            })}
          </Group>

          <Group title="Eigenschaften">
            <ToggleRow label="Nur Angebote" subtitle="Produkte mit Streichpreis" value={filters.onlyDeals} onValueChange={(value) => onChange({ ...filters, onlyDeals: value })} />
            <ToggleRow
              label="Nur Bio"
              subtitle="Laut Produktdaten (Open Food Facts)"
              value={filters.onlyBio}
              onValueChange={(value) => onChange({ ...filters, onlyBio: value })}
              last
            />
          </Group>

          <View style={{ gap: Spacing.two }}>
            <AppText weight="bold" size={13} color={Colors.textSecondary} style={{ paddingHorizontal: Spacing.one, letterSpacing: 0.4 }}>
              MÄRKTE
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
              {activeStores.map((store) => {
                const active = selected.includes(store.id);
                return (
                  <Pressable
                    key={store.id}
                    onPress={() => toggleStore(store.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: Spacing.two,
                      paddingHorizontal: Inset.compact,
                      paddingVertical: Spacing.two,
                      borderRadius: Radius.medium,
                      borderWidth: active ? 2 : 1,
                      borderColor: active ? Colors.primary : Colors.border,
                    }}>
                    <StoreBadge storeId={store.id} size="large" />
                    <AppText weight="semibold" size={14}>
                      {store.name}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            <AppText size={12} color={Colors.textSecondary} style={{ paddingHorizontal: Spacing.one }}>
              Welche Märkte aktiv sind, legst du unter Profil › Meine Märkte fest.
            </AppText>
          </View>
        </ScrollView>

        <View style={{ padding: Spacing.four, borderTopWidth: 1, borderTopColor: Colors.border }}>
          <PrimaryButton label={`${resultCount} Treffer anzeigen`} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
