import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { OffersCallout } from '@/components/offers-callout';
import { ProductCard } from '@/components/product-card';
import { OfflineBanner } from '@/components/system-states';
import { AppText, Card, DemoNotice, FoxLogo, Icon, SectionHeader, StoreBadge } from '@/components/ui';
import { Colors, Radius, Spacing, Inset } from '@/constants/theme';
import { categories, products } from '@/data/products';
import { closingLabel } from '@/data/stores';
import { discountPercent, formatEuro, offerWeekLabel, priceLevel, sortedPrices, totalsPerStore } from '@/lib/pricing';
import { useAppState } from '@/state/app-state';

const QUICK_SEARCHES = ['Milch', 'Butter', 'Eier', 'Bananen', 'Kaffee'];

export default function StartScreen() {
  const { cart, activeStoreIds, location, stores, unreadCount } = useAppState();
  const nearbyStores = stores.filter((store) => activeStoreIds.includes(store.id) && store.distanceKm <= location.radiusKm);
  const deals = products
    .filter((product) => discountPercent(sortedPrices(product, activeStoreIds)[0]))
    .sort((a, b) => (discountPercent(sortedPrices(b, activeStoreIds)[0]) ?? 0) - (discountPercent(sortedPrices(a, activeStoreIds)[0]) ?? 0));
  const cheapNow = products.filter((product) => priceLevel(product, activeStoreIds).level === 'günstig').slice(0, 6);
  const totals = totalsPerStore(cart, products, activeStoreIds);
  const bestStore = totals[0];
  const worstComplete = totals.filter((item) => item.availableCount === bestStore?.availableCount).at(-1);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: Spacing.six, gap: Spacing.five }}
      style={{ backgroundColor: Colors.background }}>
      {/* Kopfbereich */}
      <View style={{ paddingHorizontal: Spacing.four, gap: Spacing.four }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
            <FoxLogo />
            <AppText weight="extrabold" size={22}>
              Preisfuchs
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
          <Pressable
            onPress={() => router.push('/benachrichtigungen')}
            accessibilityLabel={unreadCount > 0 ? `Benachrichtigungen, ${unreadCount} ungelesen` : 'Benachrichtigungen'}
            hitSlop={6}
            style={{ width: 36, height: 36, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={{ ios: 'bell', android: 'notifications', web: 'notifications' }} size={17} color={Colors.text} />
            {unreadCount > 0 ? (
              <View style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                <AppText weight="bold" size={10} color="#FFFFFF">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </AppText>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            onPress={() => router.push('/einstellungen/standort')}
            style={{ backgroundColor: Colors.card, borderRadius: Radius.pill, paddingHorizontal: Inset.compact, paddingVertical: Inset.stepperV, borderWidth: 1, borderColor: Colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name={{ ios: 'location.fill', android: 'location_on', web: 'location_on' }} size={13} color={Colors.primary} />
              <AppText weight="semibold" size={13}>
                {location.plz} {location.city} · {location.radiusKm} km
              </AppText>
            </View>
          </Pressable>
          </View>
        </View>

        <AppText weight="extrabold" size={28} style={{ lineHeight: 34 }}>
          Hallo! Was brauchst du heute?
        </AppText>

        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <Link href="/suche" asChild>
            <Pressable
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
              <AppText size={15} color={Colors.textSecondary}>
                Produkt oder Marke suchen
              </AppText>
            </Pressable>
          </Link>
          <Pressable
            onPress={() => router.push('/scanner')}
            accessibilityLabel="Barcode scannen"
            style={{ width: 52, height: 52, borderRadius: Radius.large, backgroundColor: Colors.text, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={{ ios: 'barcode.viewfinder', android: 'barcode_scanner', web: 'barcode_scanner' }} size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <OfflineBanner />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
          {QUICK_SEARCHES.map((term) => (
            <Link key={term} href={{ pathname: '/suche', params: { q: term } }} asChild>
              <Pressable style={{ backgroundColor: Colors.card, borderRadius: Radius.pill, paddingHorizontal: Inset.chipH, paddingVertical: Inset.chipV, borderWidth: 1, borderColor: Colors.border }}>
                <AppText weight="semibold" size={13}>
                  {term}
                </AppText>
              </Pressable>
            </Link>
          ))}
        </ScrollView>
      </View>

      {/* Angebote prominent direkt unter der Suche */}
      <View style={{ paddingHorizontal: Spacing.four }}>
        <OffersCallout />
      </View>

      {/* Runde Kategorie-Bilder */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.three, paddingHorizontal: Spacing.four }}>
        {categories.map((category) => (
          <Link key={category.id} href={{ pathname: '/kategorie/[id]', params: { id: category.id } }} asChild>
            <Pressable style={{ alignItems: 'center', width: 72, gap: 6 }}>
              <Image source={category.imageUrl} style={{ width: 64, height: 64, borderRadius: 32 }} contentFit="cover" />
              <AppText weight="semibold" size={11} numberOfLines={2} style={{ textAlign: 'center' }}>
                {category.label}
              </AppText>
            </Pressable>
          </Link>
        ))}
      </ScrollView>

      {/* Top-Angebote als Slider */}
      <View style={{ gap: Spacing.three }}>
        <View style={{ paddingHorizontal: Spacing.four }}>
          <SectionHeader title={`Top-Angebote · ${offerWeekLabel()}`} meta={`${deals.length} Artikel`} action="Alle" onAction={() => router.push('/angebote')} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.three, paddingHorizontal: Spacing.four }}>
          {deals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </ScrollView>
      </View>

      {/* Listen-Karte */}
      {bestStore && cart.length > 0 ? (
        <View style={{ paddingHorizontal: Spacing.four }}>
          <Link href="/warenkorb" asChild>
            <Pressable>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, backgroundColor: Colors.greenSoft, borderColor: Colors.greenSoft }}>
                <Icon name={{ ios: 'basket.fill', android: 'shopping_basket', web: 'shopping_basket' }} size={24} color={Colors.green} />
                <View style={{ flex: 1 }}>
                  <AppText weight="bold" size={15}>
                    Dein Warenkorb · {cart.length} Artikel
                  </AppText>
                  <AppText size={13} color={Colors.green}>
                    Am günstigsten bei {stores.find((store) => store.id === bestStore.storeId)?.name}: {formatEuro(bestStore.total)}
                    {worstComplete && worstComplete.total > bestStore.total
                      ? ` (−${formatEuro(worstComplete.total - bestStore.total)})`
                      : ''}
                  </AppText>
                </View>
                <Icon name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={14} color={Colors.green} />
              </Card>
            </Pressable>
          </Link>
        </View>
      ) : null}

      {/* Maerkte in der Naehe */}
      <View style={{ gap: Spacing.three }}>
        <View style={{ paddingHorizontal: Spacing.four }}>
          <SectionHeader title="Märkte in deiner Nähe" meta={`${nearbyStores.length} aktive Märkte im Umkreis von ${location.radiusKm} km`} action="Verwalten" onAction={() => router.push('/einstellungen/maerkte')} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.three, paddingHorizontal: Spacing.four }}>
          {nearbyStores.map((store) => {
            const offers = products.filter((product) =>
              product.prices.some((price) => price.storeId === store.id && price.regularPrice),
            ).length;
            return (
              <Pressable key={store.id} onPress={() => router.push({ pathname: '/markt/[id]', params: { id: store.id } })}>
              <Card style={{ width: 150, gap: Spacing.two, padding: Inset.row }}>
                <StoreBadge storeId={store.id} size="large" />
                <AppText weight="bold" size={14}>
                  {store.name}
                </AppText>
                <AppText size={12} color={Colors.textSecondary}>
                  {store.distanceKm.toLocaleString('de-DE')} km{closingLabel(store.openingHours) ? ` · ${closingLabel(store.openingHours)}` : ''}
                </AppText>
                <AppText weight="semibold" size={12} color={Colors.primary}>
                  {offers} Angebote
                </AppText>
              </Card>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Gerade guenstig */}
      {cheapNow.length > 0 ? (
        <View style={{ gap: Spacing.three }}>
          <View style={{ paddingHorizontal: Spacing.four }}>
            <SectionHeader title="Gerade günstig" meta="Unter dem 8-Wochen-Durchschnitt" />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.three, paddingHorizontal: Spacing.four }}>
            {cheapNow.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <DemoNotice style={{ marginHorizontal: Spacing.four }} />
    </ScrollView>
  );
}
