import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText, Pill, StoreBadge } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { Product } from '@/data/products';
import type { StoreId } from '@/data/stores';
import { cheapestPrice, discountPercent, formatEuro, unitPriceLabel } from '@/lib/pricing';
import { useAppState } from '@/state/app-state';

// Deal-Karte im Stil der Liefer-Apps: Foto, Rabatt oben links, "+" unten rechts.
// Mit storeId zeigt die Karte den Preis dieses Markts statt des guenstigsten.
export function ProductCard({ product, width = 156, storeId }: { product: Product; width?: number; storeId?: StoreId }) {
  const { addToCart, activeStoreIds } = useAppState();
  const best = (storeId && product.prices.find((price) => price.storeId === storeId)) || cheapestPrice(product, activeStoreIds);
  const discount = discountPercent(best);

  return (
    <Link href={{ pathname: '/produkt/[id]', params: { id: product.id } }} asChild>
      <Pressable style={{ width }}>
        <View style={{ backgroundColor: Colors.tile, borderRadius: Radius.large, aspectRatio: 1, overflow: 'hidden' }}>
          <Image source={product.imageUrl} style={{ flex: 1 }} contentFit="cover" transition={150} />
          {discount ? (
            <View style={{ position: 'absolute', top: 8, left: 8 }}>
              <Pill tone="orange" label={`-${discount} %`} />
            </View>
          ) : null}
          <Pressable
            accessibilityLabel={`${product.name} zum Warenkorb hinzufügen`}
            onPress={() => addToCart(product.id)}
            hitSlop={8}
            style={{
              position: 'absolute',
              right: 8,
              bottom: 8,
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: Colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <AppText weight="bold" size={22} color="#FFFFFF" style={{ marginTop: -2 }}>
              +
            </AppText>
          </Pressable>
        </View>
        <View style={{ gap: 3, paddingTop: Spacing.two }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <AppText weight="extrabold" size={17} color={best.regularPrice ? Colors.deal : Colors.text}>
              {formatEuro(best.price)}
            </AppText>
            {best.regularPrice ? (
              <AppText size={12} color={Colors.textSecondary} style={{ textDecorationLine: 'line-through' }}>
                {formatEuro(best.regularPrice)}
              </AppText>
            ) : null}
          </View>
          <AppText weight="semibold" size={13} numberOfLines={1}>
            {product.brand} {product.name}
          </AppText>
          <AppText size={11} color={Colors.textSecondary} numberOfLines={1}>
            {product.packageSize} · {unitPriceLabel(product, best.price)}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <StoreBadge storeId={best.storeId} />
            {best.regularPrice ? (
              <Pill tone="green" label={`${formatEuro(best.regularPrice - best.price)} gespart`} />
            ) : null}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
