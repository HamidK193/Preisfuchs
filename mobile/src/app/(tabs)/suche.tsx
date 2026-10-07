import { Image } from 'expo-image';
import { Link, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { OffersCallout } from '@/components/offers-callout';
import { AppText, DemoNotice, Icon, StoreBadge } from '@/components/ui';
import { Colors, Radius, Spacing, Inset } from '@/constants/theme';
import { categories, products } from '@/data/products';
import { cheapestPrice, formatEuro, priceLevel, unitPriceLabel } from '@/lib/pricing';
import { useAppState } from '@/state/app-state';

type SortKey = 'preis' | 'grundpreis';

const LEVEL_COLOR = { günstig: Colors.greenText, normal: Colors.warning, teuer: Colors.danger } as const;

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string; kategorie?: string }>();
  const { addToCart, activeStoreIds } = useAppState();
  const [query, setQuery] = useState(params.q ?? '');
  const [categoryId, setCategoryId] = useState<string | undefined>(params.kategorie);
  const [sort, setSort] = useState<SortKey>('grundpreis');
  const [onlyDeals, setOnlyDeals] = useState(false);

  // Uebernimmt Suchbegriffe, wenn die Suche vom Start-Screen aus geoeffnet wird.
  const paramKey = `${params.q ?? ''}|${params.kategorie ?? ''}`;
  const [appliedParamKey, setAppliedParamKey] = useState(paramKey);
  if (paramKey !== appliedParamKey) {
    setAppliedParamKey(paramKey);
    if (params.q !== undefined) setQuery(params.q);
    if (params.kategorie !== undefined) setCategoryId(params.kategorie);
  }

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products
      .filter((product) => !categoryId || product.categoryId === categoryId)
      .filter((product) => !onlyDeals || product.prices.some((price) => price.regularPrice))
      .filter((product) => {
        if (!needle) return true;
        const haystack = [product.brand, product.name, ...(product.keywords ?? [])].join(' ').toLowerCase();
        return haystack.includes(needle);
      })
      .sort((a, b) => {
        const pa = cheapestPrice(a, activeStoreIds).price;
        const pb = cheapestPrice(b, activeStoreIds).price;
        return sort === 'preis' ? pa - pb : pa / a.unitAmount - pb / b.unitAmount;
      });
  }, [query, categoryId, sort, onlyDeals, activeStoreIds]);

  const chip = (label: string, active: boolean, onPress: () => void) => (
    <Pressable
      key={label}
      onPress={onPress}
      style={{
        backgroundColor: active ? Colors.text : Colors.card,
        borderRadius: Radius.pill,
        paddingHorizontal: Inset.chipH,
        paddingVertical: Inset.chipV,
        borderWidth: 1,
        borderColor: active ? Colors.text : Colors.border,
      }}>
      <AppText weight="semibold" size={13} color={active ? '#FFFFFF' : Colors.text}>
        {label}
      </AppText>
    </Pressable>
  );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: Colors.background }}
      contentContainerStyle={{ paddingBottom: Spacing.six, gap: Spacing.four }}>
      <View style={{ paddingHorizontal: Spacing.four, gap: Spacing.three }}>
        <AppText weight="extrabold" size={28}>
          Suche
        </AppText>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.two,
            backgroundColor: Colors.card,
            borderRadius: Radius.large,
            paddingHorizontal: Inset.card,
            height: 52,
            borderWidth: 1,
            borderColor: Colors.border,
          }}>
          <Icon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={18} color={Colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="z. B. Butter, Milch, Kaffee"
            placeholderTextColor={Colors.textSecondary}
            returnKeyType="search"
            autoCorrect={false}
            style={{ flex: 1, fontWeight: '500', fontSize: 16, color: Colors.text }}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Icon name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }} size={18} color={Colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {!query.trim() && !categoryId ? (
        <View style={{ paddingHorizontal: Spacing.four }}>
          <OffersCallout compact />
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two, paddingHorizontal: Spacing.four }}>
        {chip('Alle', !categoryId, () => setCategoryId(undefined))}
        {categories.map((category) =>
          chip(category.label, categoryId === category.id, () =>
            setCategoryId(categoryId === category.id ? undefined : category.id),
          ),
        )}
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.four, flexWrap: 'wrap' }}>
        {chip('Nur Angebote', onlyDeals, () => setOnlyDeals(!onlyDeals))}
        {chip('Nach Grundpreis', sort === 'grundpreis', () => setSort('grundpreis'))}
        {chip('Nach Preis', sort === 'preis', () => setSort('preis'))}
      </View>

      <View style={{ paddingHorizontal: Spacing.four, gap: Spacing.three }}>
        <AppText weight="semibold" size={13} color={Colors.textSecondary}>
          {results.length} Treffer
        </AppText>

        {results.length === 0 ? (
          <View style={{ alignItems: 'center', gap: Spacing.three, paddingVertical: Inset.empty }}>
            <AppText size={96}>🦊</AppText>
            <AppText weight="extrabold" size={18} style={{ textAlign: 'center' }}>
              Dazu haben wir noch keine Preise
            </AppText>
            <AppText size={14} color={Colors.textSecondary} style={{ textAlign: 'center' }}>
              Versuch einen anderen Begriff oder eine andere Kategorie.
            </AppText>
          </View>
        ) : null}

        {results.map((product) => {
          const best = cheapestPrice(product, activeStoreIds);
          const level = priceLevel(product, activeStoreIds).level;
          return (
            <Link key={product.id} href={{ pathname: '/produkt/[id]', params: { id: product.id } }} asChild>
              <Pressable
                style={{
                  flexDirection: 'row',
                  gap: Spacing.three,
                  backgroundColor: Colors.card,
                  borderRadius: Radius.large,
                  padding: Inset.compact,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  alignItems: 'center',
                }}>
                <Image source={product.imageUrl} style={{ width: 72, height: 72, borderRadius: Radius.medium }} contentFit="cover" />
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
                      in {product.prices.length} Märkten
                    </AppText>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: LEVEL_COLOR[level] }} />
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <AppText weight="extrabold" size={17} color={best.regularPrice ? Colors.deal : Colors.text}>
                    {formatEuro(best.price)}
                  </AppText>
                  <Pressable
                    onPress={() => addToCart(product.id)}
                    accessibilityLabel={`${product.name} zum Warenkorb hinzufügen`}
                    hitSlop={8}
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

      <DemoNotice style={{ marginHorizontal: Spacing.four }} />
    </ScrollView>
  );
}
