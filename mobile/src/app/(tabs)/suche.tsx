import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { OffersCallout } from '@/components/offers-callout';
import { SearchFilterSheet, type SearchFilters } from '@/components/search-filter-sheet';
import { SecondaryButton } from '@/components/settings';
import { EmptyState, OfflineBanner } from '@/components/system-states';
import { AppText, DemoNotice, Icon, StoreBadge } from '@/components/ui';
import { Colors, Radius, Spacing, Inset } from '@/constants/theme';
import { categories, products, type Product } from '@/data/products';
import { cheapestPrice, discountPercent, formatEuro, priceLevel, unitPriceLabel } from '@/lib/pricing';
import { useAppState } from '@/state/app-state';

const LEVEL_COLOR = { günstig: Colors.greenText, normal: Colors.warning, teuer: Colors.danger } as const;
const POPULAR = ['Milch', 'Butter', 'Eier', 'Kaffee', 'Bananen', 'Nudeln'];
const DEFAULT_FILTERS: SearchFilters = { sort: 'grundpreis', onlyDeals: false, onlyBio: false, storeIds: undefined };

function searchText(product: Product): string {
  return [product.brand, product.name, ...(product.keywords ?? [])].join(' ').toLowerCase();
}

// Aehnliche Begriffe fuer "Meintest du …": Produkte, die ein Wort der Suche (ab 3 Buchstaben) enthalten.
function suggestionsFor(query: string): Product[] {
  const words = query
    .toLowerCase()
    .split(/[\s-]+/)
    .filter((word) => word.length >= 3);
  return products.filter((product) => words.some((word) => searchText(product).includes(word.slice(0, 4)))).slice(0, 4);
}

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string; kategorie?: string }>();
  const { addToCart, activeStoreIds, recentSearches, addRecentSearch, removeRecentSearch } = useAppState();
  const [query, setQuery] = useState(params.q ?? '');
  const [categoryId, setCategoryId] = useState<string | undefined>(params.kategorie);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  // Uebernimmt Suchbegriffe, wenn die Suche vom Start-Screen aus geoeffnet wird.
  const paramKey = `${params.q ?? ''}|${params.kategorie ?? ''}`;
  const [appliedParamKey, setAppliedParamKey] = useState(paramKey);
  if (paramKey !== appliedParamKey) {
    setAppliedParamKey(paramKey);
    if (params.q !== undefined) setQuery(params.q);
    if (params.kategorie !== undefined) setCategoryId(params.kategorie);
  }

  // Maerkte im Vergleich: aktive Maerkte, optional im Filter eingeschraenkt.
  const storeIds = filters.storeIds?.filter((id) => activeStoreIds.includes(id)) ?? activeStoreIds;
  const activeFilterCount =
    (filters.onlyDeals ? 1 : 0) + (filters.onlyBio ? 1 : 0) + (filters.storeIds ? 1 : 0) + (filters.sort !== 'grundpreis' ? 1 : 0);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products
      .filter((product) => !categoryId || product.categoryId === categoryId)
      .filter((product) => !filters.storeIds || product.prices.some((price) => storeIds.includes(price.storeId)))
      .filter(
        (product) =>
          !filters.onlyDeals || product.prices.some((price) => price.regularPrice && (!filters.storeIds || storeIds.includes(price.storeId))),
      )
      .filter((product) => !filters.onlyBio || product.info?.labels?.includes('Bio') || /\bbio\b/i.test(product.name))
      .filter((product) => !needle || searchText(product).includes(needle))
      .sort((a, b) => {
        const ca = cheapestPrice(a, storeIds);
        const cb = cheapestPrice(b, storeIds);
        if (filters.sort === 'rabatt') return (discountPercent(cb) ?? 0) - (discountPercent(ca) ?? 0);
        if (filters.sort === 'preis') return ca.price - cb.price;
        return ca.price / a.unitAmount - cb.price / b.unitAmount;
      });
    // storeIds wird aus activeStoreIds und filters abgeleitet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, categoryId, filters, activeStoreIds]);

  const idle = !query.trim() && !categoryId;

  const chip = (label: string, active: boolean, onPress: () => void, icon?: boolean) => (
    <Pressable
      key={label}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: active ? Colors.text : Colors.card,
        borderRadius: Radius.pill,
        paddingHorizontal: Inset.chipH,
        paddingVertical: Inset.chipV,
        borderWidth: 1,
        borderColor: active ? Colors.text : Colors.border,
      }}>
      {icon ? <Icon name={{ ios: 'clock.arrow.circlepath', android: 'history', web: 'history' }} size={13} color={Colors.textSecondary} /> : null}
      <AppText weight="semibold" size={13} color={active ? '#FFFFFF' : Colors.text}>
        {label}
      </AppText>
    </Pressable>
  );

  const openProduct = (product: Product) => {
    if (query.trim()) addRecentSearch(query);
    router.push({ pathname: '/produkt/[id]', params: { id: product.id } });
  };

  return (
    <>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: Colors.background }}
        contentContainerStyle={{ paddingBottom: Spacing.six, gap: Spacing.four }}>
        <View style={{ paddingHorizontal: Spacing.four, gap: Spacing.three }}>
          <AppText weight="extrabold" size={28}>
            Suche
          </AppText>
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            <View
              style={{
                flex: 1,
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
                onSubmitEditing={() => addRecentSearch(query)}
                placeholder="z. B. Butter, Milch, Kaffee"
                placeholderTextColor={Colors.textSecondary}
                returnKeyType="search"
                autoCorrect={false}
                style={{ flex: 1, fontWeight: '500', fontSize: 16, color: Colors.text }}
              />
              {query ? (
                <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Suche leeren">
                  <Icon name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }} size={18} color={Colors.textSecondary} />
                </Pressable>
              ) : null}
            </View>
            <Pressable
              onPress={() => router.push('/scanner')}
              accessibilityLabel="Barcode scannen"
              style={{ width: 52, height: 52, borderRadius: Radius.large, backgroundColor: Colors.text, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={{ ios: 'barcode.viewfinder', android: 'barcode_scanner', web: 'barcode_scanner' }} size={22} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        <OfflineBanner style={{ marginHorizontal: Spacing.four }} />

        {idle ? (
          <View style={{ paddingHorizontal: Spacing.four, gap: Spacing.four }}>
            {recentSearches.length > 0 ? (
              <View style={{ gap: Spacing.two }}>
                <AppText weight="extrabold" size={17}>
                  Zuletzt gesucht
                </AppText>
                {recentSearches.map((term) => (
                  <View key={term} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two }}>
                    <Icon name={{ ios: 'clock', android: 'schedule', web: 'schedule' }} size={16} color={Colors.textSecondary} />
                    <Pressable style={{ flex: 1 }} onPress={() => setQuery(term)}>
                      <AppText size={15}>{term}</AppText>
                    </Pressable>
                    <Pressable onPress={() => removeRecentSearch(term)} hitSlop={10} accessibilityLabel={`${term} aus dem Verlauf entfernen`}>
                      <Icon name={{ ios: 'xmark', android: 'close', web: 'close' }} size={13} color={Colors.textSecondary} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
            <View style={{ gap: Spacing.two }}>
              <AppText weight="extrabold" size={17}>
                Beliebt
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
                {POPULAR.map((term) => chip(term, false, () => setQuery(term)))}
              </View>
            </View>
            <OffersCallout compact />
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two, paddingHorizontal: Spacing.four }}>
          {chip('Alle', !categoryId, () => setCategoryId(undefined))}
          {categories.map((category) =>
            chip(category.label, categoryId === category.id, () => setCategoryId(categoryId === category.id ? undefined : category.id)),
          )}
        </ScrollView>

        <View style={{ paddingHorizontal: Spacing.four, gap: Spacing.three }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText weight="semibold" size={13} color={Colors.textSecondary}>
              {results.length} Treffer · sortiert nach {{ grundpreis: 'Grundpreis', preis: 'Preis', rabatt: 'Rabatt' }[filters.sort]}
            </AppText>
            <Pressable
              onPress={() => setFilterOpen(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: Inset.chipH,
                paddingVertical: Inset.chipV,
                borderRadius: Radius.pill,
                borderWidth: 1,
                borderColor: activeFilterCount ? Colors.text : Colors.border,
              }}>
              <Icon name={{ ios: 'slider.horizontal.3', android: 'tune', web: 'tune' }} size={15} />
              <AppText weight="semibold" size={13}>
                Filter{activeFilterCount ? ` (${activeFilterCount})` : ''}
              </AppText>
            </Pressable>
          </View>

          {results.length === 0 ? (
            <EmptyState
              title={query.trim() ? `Keine Treffer für „${query.trim()}“` : 'Keine Treffer'}
              text={
                activeFilterCount
                  ? 'Mit den gewählten Filtern passt kein Produkt. Lockere die Filter oder such nach etwas anderem.'
                  : 'Dazu haben wir noch keine Preise. Versuch einen anderen Begriff oder scanne den Barcode.'
              }>
              {query.trim() && suggestionsFor(query).length > 0 ? (
                <View style={{ alignItems: 'center', gap: Spacing.two }}>
                  <AppText weight="semibold" size={13} color={Colors.textSecondary}>
                    Meintest du:
                  </AppText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.two }}>
                    {suggestionsFor(query).map((product) => chip(product.name, false, () => setQuery(product.name)))}
                  </View>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', gap: Spacing.two, alignSelf: 'stretch', marginTop: Spacing.two }}>
                {activeFilterCount ? (
                  <SecondaryButton label="Filter zurücksetzen" onPress={() => setFilters(DEFAULT_FILTERS)} style={{ flex: 1 }} />
                ) : null}
                <SecondaryButton label="Barcode scannen" onPress={() => router.push('/scanner')} style={{ flex: 1 }} />
              </View>
            </EmptyState>
          ) : null}

          {results.map((product) => {
            const best = cheapestPrice(product, storeIds);
            const level = priceLevel(product, storeIds).level;
            return (
              <Pressable
                key={product.id}
                onPress={() => openProduct(product)}
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
            );
          })}
        </View>

        <DemoNotice style={{ marginHorizontal: Spacing.four }} />
      </ScrollView>

      <SearchFilterSheet
        visible={filterOpen}
        filters={filters}
        resultCount={results.length}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
        onClose={() => setFilterOpen(false)}
      />
    </>
  );
}
