import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import { AppText, SourceLine, StoreBadge } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import type { Product, PriceObservation } from '@/data/products';
import { formatEuro, unitPriceLabel } from '@/lib/pricing';

export function SearchResultRow({ product, observation, onPress, onAdd }: {
  product: Product; observation?: PriceObservation; onPress: () => void; onAdd: () => void;
}) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${product.brand} ${product.name}`}
    style={{ flexDirection: 'row', gap: Spacing.three, backgroundColor: Colors.card, borderRadius: Radius.large, padding: Inset.compact, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' }}>
    <Image source={product.imageThumbUrl || product.imageUrl || undefined} style={{ width: 64, height: 64 }} contentFit="contain" />
    <View style={{ flex: 1, gap: 4 }}>
      <AppText weight="bold" size={15}>{product.brand} {product.name}</AppText>
      <AppText size={12}>{product.packageSize}</AppText>
      {observation ? <>
        <StoreBadge storeId={observation.storeId} />
        <AppText weight="bold">{formatEuro(observation.price)} · {unitPriceLabel(product, observation.price)}</AppText>
        <SourceLine observation={observation} />
      </> : <AppText size={12}>Keine Preisbeobachtung · Open Food Facts</AppText>}
    </View>
    <Pressable onPress={onAdd} accessibilityRole="button" accessibilityLabel={`${product.name} zur Einkaufsliste`} hitSlop={8}><AppText size={24}>+</AppText></Pressable>
  </Pressable>;
}
