import { Image } from 'expo-image';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppText, StoreBadge } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import { categories, products } from '@/data/products';
import { cheapestPrice, formatEuro, unitPriceLabel } from '@/lib/pricing';
import { useAppState } from '@/state/app-state';

type Sort = 'grundpreis' | 'preis';

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeStoreIds, addToCart } = useAppState();
  const [sort, setSort] = useState<Sort>('grundpreis');
  const category = categories.find((item) => item.id === id);

  const items = products
    .filter((product) => product.categoryId === id)
    .sort((a, b) => {
      const pa = cheapestPrice(a, activeStoreIds).price;
      const pb = cheapestPrice(b, activeStoreIds).price;
      return sort === 'preis' ? pa - pb : pa / a.unitAmount - pb / b.unitAmount;
    });

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: Colors.background }} contentContainerStyle={{ paddingBottom: Spacing.six, gap: Spacing.four }}>
      <Stack.Screen options={{ title: category?.label ?? 'Kategorie' }} />

      {/* Andere Kategorien als runde Bilder */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.three, paddingHorizontal: Spacing.four }}>
        {categories.map((item) => {
          const selected = item.id === id;
          return (
            <Link key={item.id} href={{ pathname: '/kategorie/[id]', params: { id: item.id } }} replace asChild>
              <Pressable style={{ alignItems: 'center', width: 68, gap: 6 }}>
                <Image
                  source={item.imageUrl}
                  style={{ width: 60, height: 60, borderRadius: 30, borderWidth: selected ? 3 : 0, borderColor: Colors.primary }}
                  contentFit="cover"
                />
                <AppText weight={selected ? 'bold' : 'semibold'} size={11} numberOfLines={2} style={{ textAlign: 'center' }} color={selected ? Colors.primary : Colors.text}>
                  {item.label}
                </AppText>
              </Pressable>
            </Link>
          );
        })}
      </ScrollView>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.four }}>
        <AppText weight="semibold" size={13} color={Colors.textSecondary}>
          {items.length} Produkte
        </AppText>
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          {(['grundpreis', 'preis'] as Sort[]).map((item) => (
            <Pressable
              key={item}
              onPress={() => setSort(item)}
              style={{
                paddingHorizontal: Inset.chipH,
                paddingVertical: 6,
                borderRadius: Radius.pill,
                borderWidth: 1,
                borderColor: sort === item ? Colors.text : Colors.border,
                backgroundColor: sort === item ? Colors.text : Colors.card,
              }}>
              <AppText weight="bold" size={12} color={sort === item ? '#FFFFFF' : Colors.text}>
                {item === 'grundpreis' ? 'Grundpreis' : 'Preis'}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: Spacing.four, gap: Spacing.three }}>
        {items.length === 0 ? (
          <AppText size={14} color={Colors.textSecondary}>
            In dieser Kategorie gibt es noch keine Preise.
          </AppText>
        ) : null}
        {items.map((product) => {
          const best = cheapestPrice(product, activeStoreIds);
          return (
            <Link key={product.id} href={{ pathname: '/produkt/[id]', params: { id: product.id } }} asChild>
              <Pressable
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.three,
                  padding: Inset.compact,
                  borderRadius: Radius.large,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  backgroundColor: pressed ? Colors.tile : Colors.card,
                })}>
                <Image source={product.imageUrl} style={{ width: 64, height: 64, borderRadius: Radius.medium }} contentFit="cover" />
                <View style={{ flex: 1, gap: 3 }}>
                  <AppText weight="bold" size={15} numberOfLines={1}>
                    {product.brand} {product.name}
                  </AppText>
                  <AppText size={12} color={Colors.textSecondary}>
                    {product.packageSize} · {unitPriceLabel(product, best.price)}
                  </AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <StoreBadge storeId={best.storeId} />
                    <AppText size={12} color={Colors.textSecondary}>
                      in {product.prices.filter((price) => activeStoreIds.includes(price.storeId)).length} Märkten
                    </AppText>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <AppText weight="extrabold" size={17} color={best.regularPrice ? Colors.deal : Colors.text}>
                    {formatEuro(best.price)}
                  </AppText>
                  <Pressable
                    onPress={() => addToCart(product.id)}
                    hitSlop={8}
                    accessibilityLabel={`${product.name} zum Warenkorb hinzufügen`}
                    style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                    <AppText weight="bold" size={20} color="#FFFFFF" style={{ marginTop: -2 }}>
                      +
                    </AppText>
                  </Pressable>
                </View>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </ScrollView>
  );
}
