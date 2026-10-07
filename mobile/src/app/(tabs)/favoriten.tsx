import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { AppText, Icon, PriceLevelPill, SourceLine, StoreBadge } from '@/components/ui';
import { Colors, Radius, Spacing, Inset } from '@/constants/theme';
import { products } from '@/data/products';
import { cheapestPrice, formatEuro, priceLevel } from '@/lib/pricing';
import { useAppState } from '@/state/app-state';

export default function FavoritesScreen() {
  const { favorites, toggleFavorite, addToCart, activeStoreIds } = useAppState();
  const items = products.filter((product) => favorites.includes(product.id));

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: Colors.background }}
      contentContainerStyle={{ padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.six }}>
      <View style={{ gap: 4 }}>
        <AppText weight="extrabold" size={28}>
          Favoriten
        </AppText>
        <AppText size={14} color={Colors.textSecondary}>
          Behalte die Preise deiner Lieblingsprodukte im Blick. Preisalarme folgen in der nächsten Version.
        </AppText>
      </View>

      {items.length === 0 ? (
        <View style={{ alignItems: 'center', gap: Spacing.three, paddingVertical: Inset.empty }}>
          <AppText size={96}>🦊</AppText>
          <AppText weight="extrabold" size={18}>
            Noch keine Favoriten
          </AppText>
          <AppText size={14} color={Colors.textSecondary} style={{ textAlign: 'center' }}>
            Tippe im Produkt auf das Herz, um es hier zu speichern.
          </AppText>
        </View>
      ) : null}

      {items.map((product) => {
        const best = cheapestPrice(product, activeStoreIds);
        const { level, percentVsAverage } = priceLevel(product, activeStoreIds);
        return (
          <Link key={product.id} href={{ pathname: '/produkt/[id]', params: { id: product.id } }} asChild>
            <Pressable style={{ backgroundColor: Colors.card, borderRadius: Radius.large, padding: Inset.card, borderWidth: 1, borderColor: Colors.border, gap: Spacing.three }}>
              <View style={{ flexDirection: 'row', gap: Spacing.three, alignItems: 'center' }}>
                <Image source={product.imageUrl} style={{ width: 64, height: 64, borderRadius: Radius.medium }} contentFit="cover" />
                <View style={{ flex: 1, gap: 3 }}>
                  <AppText weight="bold" size={15} numberOfLines={1}>
                    {product.brand} {product.name}
                  </AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <AppText weight="extrabold" size={18} color={best.regularPrice ? Colors.deal : Colors.text}>
                      {formatEuro(best.price)}
                    </AppText>
                    <StoreBadge storeId={best.storeId} />
                  </View>
                  <SourceLine observation={best} />
                </View>
                <Pressable onPress={() => toggleFavorite(product.id)} hitSlop={10} accessibilityLabel="Aus Favoriten entfernen">
                  <Icon name={{ ios: 'heart.fill', android: 'favorite', web: 'favorite' }} size={22} color={Colors.primary} />
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <PriceLevelPill level={level} percent={Math.abs(percentVsAverage)} />
                <Pressable
                  onPress={() => addToCart(product.id)}
                  hitSlop={6}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? Colors.primaryDark : Colors.primary,
                    borderRadius: Radius.pill,
                    paddingHorizontal: Inset.chipH,
                    paddingVertical: Inset.chipV,
                  })}>
                  <AppText weight="bold" size={13} color="#FFFFFF">
                    + Warenkorb
                  </AppText>
                </Pressable>
              </View>
            </Pressable>
          </Link>
        );
      })}
    </ScrollView>
  );
}
