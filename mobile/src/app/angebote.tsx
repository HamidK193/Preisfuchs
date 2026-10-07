import { useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

import { ProductCard } from '@/components/product-card';
import { AppText, StoreBadge } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import { products } from '@/data/products';
import type { StoreId } from '@/data/stores';
import { discountPercent, offerWeekLabel } from '@/lib/pricing';
import { useAppState } from '@/state/app-state';

type Sort = 'rabatt' | 'preis';

export default function OffersScreen() {
  const { activeStoreIds, stores } = useAppState();
  const { width } = useWindowDimensions();
  const [storeFilter, setStoreFilter] = useState<StoreId | undefined>();
  const [sort, setSort] = useState<Sort>('rabatt');
  const cardWidth = (width - Spacing.four * 2 - Spacing.three) / 2;

  // Ein Angebot je Produkt: im gewaehlten Markt oder das guenstigste aktive Angebot.
  const offers = products
    .map((product) => {
      const deals = product.prices.filter(
        (price) => price.regularPrice && activeStoreIds.includes(price.storeId) && (!storeFilter || price.storeId === storeFilter),
      );
      const deal = deals.sort((a, b) => a.price - b.price)[0];
      return deal ? { product, deal } : undefined;
    })
    .filter((item) => item !== undefined)
    .sort((a, b) =>
      sort === 'rabatt'
        ? (discountPercent(b.deal) ?? 0) - (discountPercent(a.deal) ?? 0)
        : a.deal.price - b.deal.price,
    );

  const chip = (key: string, selected: boolean, onPress: () => void, content: React.ReactNode) => (
    <Pressable
      key={key}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: Inset.chipH,
        paddingVertical: Inset.chipV,
        borderRadius: Radius.pill,
        borderWidth: 1,
        borderColor: selected ? Colors.text : Colors.border,
        backgroundColor: selected ? Colors.text : Colors.card,
      }}>
      {content}
    </Pressable>
  );

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: Colors.background }} contentContainerStyle={{ paddingBottom: Spacing.six, gap: Spacing.four }}>
      <AppText size={14} color={Colors.textSecondary} style={{ paddingHorizontal: Spacing.four }}>
        Angebotswoche {offerWeekLabel()} · {offers.length} Angebote · Prospekte (Demo)
      </AppText>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two, paddingHorizontal: Spacing.four }}>
        {chip('alle', !storeFilter, () => setStoreFilter(undefined), (
          <AppText weight="bold" size={13} color={!storeFilter ? '#FFFFFF' : Colors.text}>
            Alle
          </AppText>
        ))}
        {stores
          .filter((store) => activeStoreIds.includes(store.id))
          .map((store) =>
            chip(store.id, storeFilter === store.id, () => setStoreFilter(storeFilter === store.id ? undefined : store.id), (
              <>
                <StoreBadge storeId={store.id} />
                <AppText weight="bold" size={13} color={storeFilter === store.id ? '#FFFFFF' : Colors.text}>
                  {store.name}
                </AppText>
              </>
            )),
          )}
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.four }}>
        {chip('rabatt', sort === 'rabatt', () => setSort('rabatt'), (
          <AppText weight="bold" size={13} color={sort === 'rabatt' ? '#FFFFFF' : Colors.text}>
            Höchster Rabatt
          </AppText>
        ))}
        {chip('preis', sort === 'preis', () => setSort('preis'), (
          <AppText weight="bold" size={13} color={sort === 'preis' ? '#FFFFFF' : Colors.text}>
            Niedrigster Preis
          </AppText>
        ))}
      </View>

      {offers.length === 0 ? (
        <AppText size={14} color={Colors.textSecondary} style={{ paddingHorizontal: Spacing.four }}>
          In diesem Markt gibt es diese Woche keine Angebote in unseren Daten.
        </AppText>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, paddingHorizontal: Spacing.four, rowGap: Spacing.five }}>
        {offers.map(({ product, deal }) => (
          <ProductCard key={product.id} product={product} width={cardWidth} storeId={deal.storeId} />
        ))}
      </View>

      <AppText size={12} color={Colors.textSecondary} style={{ paddingHorizontal: Spacing.four }}>
        Angebote zeigen den Aktionspreis im jeweiligen Markt. Den günstigsten Preis über alle Märkte siehst du im Produkt.
      </AppText>
    </ScrollView>
  );
}
