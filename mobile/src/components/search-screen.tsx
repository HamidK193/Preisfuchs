import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SearchFilterSheet, type SearchFilters } from '@/components/search-filter-sheet';
import { SearchResultRow } from '@/components/search-result-row';
import { EmptyState, OfflineBanner } from '@/components/system-states';
import { AppText, DemoNotice, StoreBadge } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { categories, type Product, type PriceObservation } from '@/data/products';
import { cheapestPrice, discountPercent, formatDate } from '@/lib/pricing';
import { groupByMarket } from '@/lib/search-results';
import { useCatalogSearch } from '@/lib/use-catalog-search';
import { useAppState } from '@/state/app-state';

const DEFAULT: SearchFilters = { sort: 'grundpreis', onlyDeals: false, onlyBio: false, storeIds: undefined };
type Row = { key: string; product?: Product; observation?: PriceObservation; group?: ReturnType<typeof groupByMarket>[number] };

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string; kategorie?: string; focus?: string }>();
  const state = useAppState();
  const input = useRef<TextInput>(null);
  const [query, setQuery] = useState(params.q ?? '');
  const [category, setCategory] = useState(params.kategorie);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT);
  const [filterOpen, setFilterOpen] = useState(false);
  const [mode, setMode] = useState<'product' | 'market'>('product');
  const paramKey = `${params.q ?? ''}|${params.kategorie ?? ''}`;
  const [appliedKey, setAppliedKey] = useState(paramKey);
  if (appliedKey !== paramKey) {
    setAppliedKey(paramKey);
    if (params.q !== undefined) setQuery(params.q);
    setCategory(params.kategorie);
  }
  useFocusEffect(useCallback(() => { if (params.focus) input.current?.focus(); }, [params.focus]));
  const catalog = useCatalogSearch(query);
  const storeIds = useMemo(() => filters.storeIds?.filter((id) => state.activeStoreIds.includes(id)) ?? state.activeStoreIds, [filters.storeIds, state.activeStoreIds]);
  const results = useMemo(() => catalog.items
    .filter((p) => !category || p.categoryId === category)
    .filter((p) => !filters.storeIds || p.prices.some((price) => storeIds.includes(price.storeId)))
    .filter((p) => !filters.onlyDeals || p.prices.some((price) => storeIds.includes(price.storeId) && discountPercent(price)))
    .filter((p) => !filters.onlyBio || p.info?.labels.includes('Bio') || /\bbio\b/i.test(p.name))
    .slice().sort((a, b) => {
      const ca = cheapestPrice(a, storeIds), cb = cheapestPrice(b, storeIds);
      if (!ca || !cb) return Number(!ca) - Number(!cb) || a.id.localeCompare(b.id);
      const diff = filters.sort === 'preis' ? ca.price - cb.price : filters.sort === 'rabatt'
        ? (discountPercent(cb) ?? 0) - (discountPercent(ca) ?? 0) : ca.price / a.unitAmount - cb.price / b.unitAmount;
      return diff || a.id.localeCompare(b.id);
    }), [catalog.items, category, filters, storeIds]);
  const groups = useMemo(() => groupByMarket(results, storeIds), [results, storeIds]);
  const rows: Row[] = mode === 'product'
    ? results.map((product) => ({ key: product.id, product, observation: cheapestPrice(product, storeIds) }))
    : groups.flatMap((group) => [{ key: group.storeId, group }, ...group.items.map((item) => ({ key: `${group.storeId}:${item.product.id}`, ...item }))]);

  const button = (label: string, onPress: () => void, selected = false) => (
    <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
      style={{ padding: 10, borderRadius: Radius.pill, backgroundColor: selected ? Colors.tile : Colors.card }}>
      <AppText weight="semibold" size={13}>{label}</AppText>
    </Pressable>
  );
  const open = (product: Product) => {
    state.addRecentSearch(query);
    router.push({ pathname: '/produkt/[id]', params: { id: product.id } });
  };
  return <>
    <FlatList data={rows} keyExtractor={(row) => row.key} keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: Colors.background }} contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: Spacing.four, gap: Spacing.three }}
      onEndReached={catalog.loadMore} onEndReachedThreshold={0.5}
      ListHeaderComponent={<View style={{ gap: Spacing.three }}>
        <AppText weight="extrabold" size={28}>Suche</AppText>
        <TextInput ref={input} value={query} onChangeText={setQuery} onSubmitEditing={() => state.addRecentSearch(query)}
          accessibilityLabel="Produkt oder Marke suchen" placeholder="Produkt oder Marke suchen" returnKeyType="search" autoCorrect={false}
          style={{ backgroundColor: Colors.card, padding: 14, borderRadius: Radius.large, color: Colors.text, fontSize: 16 }} />
        <OfflineBanner />
        {!query ? <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {[...new Set([...state.recentSearches, 'Milch', 'Butter', 'Kaffee'])].map((term) => button(term, () => setQuery(term)))}
        </View> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {button('Alle', () => setCategory(undefined), !category)}
          {categories.map((c) => button(c.label, () => setCategory(c.id), category === c.id))}
        </ScrollView>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {button('Nach Produkt', () => setMode('product'), mode === 'product')}
          {button('Nach Markt', () => setMode('market'), mode === 'market')}
          {button('Filter', () => setFilterOpen(true))}
          {button('Barcode scannen', () => router.push('/scanner'))}
        </View>
        <AppText size={12}>{results.length} Produkte{catalog.server ? ' · seitenweise Katalogsuche' : ' im geladenen Katalog'}</AppText>
        {catalog.loading ? <AppText>Katalog wird geladen …</AppText> : null}
        {catalog.error ? <AppText>Keine Verbindung zum Katalog. Gespeicherte Daten werden durchsucht.</AppText> : null}
        {mode === 'market' ? <AppText size={12}>Nur Märkte mit Preisbeobachtung; Katalogprodukte ohne Preis findest du unter „Nach Produkt“.</AppText> : null}
        <DemoNotice />
      </View>}
      ListEmptyComponent={!catalog.loading ? <EmptyState title="Keine Treffer" text="Versuche einen anderen Begriff oder passe die Filter an.">
        {button('Suche zurücksetzen', () => { setQuery(''); setCategory(undefined); setFilters(DEFAULT); })}
      </EmptyState> : null}
      ListFooterComponent={catalog.hasMore ? button('Weitere Produkte laden', catalog.loadMore) : null}
      renderItem={({ item }) => {
        if (item.group) {
          const store = state.getStore(item.group.storeId);
          return <View style={{ gap: 5 }}>
            <StoreBadge storeId={store.id} />
            <AppText weight="bold">{store.name} · {Number.isFinite(store.distanceKm) ? `${store.distanceKm.toFixed(1)} km` : 'Entfernung unbekannt'}</AppText>
            <AppText size={12}>Letzte Beobachtung · Stand: {formatDate(item.group.observedAt)}</AppText>
          </View>;
        }
        return <SearchResultRow product={item.product!} observation={item.observation} onPress={() => open(item.product!)} onAdd={() => state.addToCart(item.product!.id)} />;
      }} />
    <SearchFilterSheet visible={filterOpen} filters={filters} resultCount={results.length} onChange={setFilters} onReset={() => setFilters(DEFAULT)} onClose={() => setFilterOpen(false)} />
  </>;
}
