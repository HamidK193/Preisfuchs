import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText, Icon, StoreBadge } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import { products } from '@/data/products';
import type { StoreId } from '@/data/stores';
import { discountPercent, offerWeekLabel } from '@/lib/pricing';
import { useAppState } from '@/state/app-state';

// Auffaelliger Aufruf zu den Angeboten der aktiven Maerkte in der Naehe.
export function OffersCallout({ compact = false }: { compact?: boolean }) {
  const { activeStoreIds, location } = useAppState();
  const offers = products.flatMap((product) =>
    product.prices.filter((price) => price.regularPrice && activeStoreIds.includes(price.storeId)),
  );
  if (offers.length === 0) return null;

  const maxDiscount = Math.max(...offers.map((offer) => discountPercent(offer) ?? 0));
  const storeIds = [...new Set(offers.map((offer) => offer.storeId))] as StoreId[];

  return (
    <Pressable
      onPress={() => router.push('/angebote')}
      accessibilityRole="button"
      accessibilityLabel={`${offers.length} Angebote in deiner Nähe ansehen`}
      style={({ pressed }) => ({
        backgroundColor: pressed ? Colors.primaryDark : Colors.primary,
        borderRadius: Radius.large,
        padding: compact ? Inset.card : Inset.banner,
        gap: Spacing.three,
      })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name={{ ios: 'tag.fill', android: 'sell', web: 'sell' }} size={14} color="#FFE1E2" />
            <AppText weight="bold" size={12} color="#FFE1E2">
              ANGEBOTE IN DEINER NÄHE · {offerWeekLabel()}
            </AppText>
          </View>
          <AppText weight="extrabold" size={compact ? 20 : 24} color="#FFFFFF" style={{ lineHeight: compact ? 25 : 30 }}>
            {offers.length} Angebote, bis zu {maxDiscount} % günstiger
          </AppText>
          <AppText size={13} color="#FFE1E2">
            In {storeIds.length} Märkten im Umkreis von {location.radiusKm} km
          </AppText>
        </View>
        {compact ? null : <AppText size={52}>🦊</AppText>}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {storeIds.slice(0, 5).map((storeId) => (
            <View key={storeId} style={{ backgroundColor: '#FFFFFF', borderRadius: Radius.small, padding: 2 }}>
              <StoreBadge storeId={storeId} />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFFFF', borderRadius: Radius.pill, paddingHorizontal: Inset.chipH, paddingVertical: Inset.chipV }}>
          <AppText weight="extrabold" size={14} color={Colors.primary}>
            Jetzt ansehen
          </AppText>
          <Icon name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={12} color={Colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}
