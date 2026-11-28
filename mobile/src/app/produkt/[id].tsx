import { Image } from 'expo-image';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, Share, View } from 'react-native';

import { PriceChart } from '@/components/price-chart';
import { CatalogProductSheet } from '@/components/catalog-product-sheet';
import { SheetScroll } from '@/components/sheet';
import { ProductCard } from '@/components/product-card';
import { AppText, Card, Icon, Pill, PriceLevelPill, PriceRanking, SourceLine, sourceText, StoreBadge } from '@/components/ui';
import { isStale } from '@/lib/prices';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import { getProduct, products, type Product } from '@/data/products';
import type { StoreId } from '@/data/stores';
import { cheapestPrice, discountPercent, formatDate, formatEuro, priceLevel, unitPriceLabel } from '@/lib/pricing';
import { useAppState } from '@/state/app-state';

type Range = '8w' | '6m';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: Spacing.three }}>
      <AppText weight="extrabold" size={18}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

// Guenstigere Produkte derselben Kategorie, gemessen am Grundpreis.
function cheaperAlternatives(product: Product, storeIds: StoreId[]): Product[] {
  const ownUnitPrice = cheapestPrice(product, storeIds).price / product.unitAmount;
  return products
    .filter((item) => item.id !== product.id && item.categoryId === product.categoryId && item.unit === product.unit)
    .filter((item) => cheapestPrice(item, storeIds).price / item.unitAmount < ownUnitPrice)
    .slice(0, 4);
}

export default function ProductSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = getProduct(id);
  const { addToCart, favorites, toggleFavorite, activeStoreIds, alarms, getStore } = useAppState();
  const [quantity, setQuantity] = useState(1);
  const [range, setRange] = useState<Range>('8w');
  const [historyOpen, setHistoryOpen] = useState(false);

  if (!product) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five }}>
        <AppText weight="bold">Produkt nicht gefunden.</AppText>
      </View>
    );
  }

  if (!product.prices.length) return <CatalogProductSheet product={product} />;

  const best = cheapestPrice(product, activeStoreIds);
  const discount = discountPercent(best);
  const { level, percentVsAverage } = priceLevel(product, activeStoreIds);
  const isFavorite = favorites.includes(product.id);
  const alarm = alarms.find((item) => item.productId === product.id);
  const alternatives = cheaperAlternatives(product, activeStoreIds);
  const bestStore = getStore(best.storeId);

  // Feste Leiste unten: Menge und Zum Warenkorb.
  const footer = (
    <View
      style={{
        flexDirection: 'row',
        gap: Spacing.three,
        padding: Inset.card,
        paddingBottom: Spacing.six,
        backgroundColor: Colors.card,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border }}>
        <Pressable onPress={() => setQuantity(Math.max(1, quantity - 1))} hitSlop={6} style={{ paddingHorizontal: Inset.stepperH, paddingVertical: Inset.stepperV }}>
          <AppText weight="bold" size={18}>
            −
          </AppText>
        </Pressable>
        <AppText weight="bold" size={16}>
          {quantity}
        </AppText>
        <Pressable onPress={() => setQuantity(quantity + 1)} hitSlop={6} style={{ paddingHorizontal: Inset.stepperH, paddingVertical: Inset.stepperV }}>
          <AppText weight="bold" size={18}>
            +
          </AppText>
        </Pressable>
      </View>
      <Pressable
        onPress={() => {
          addToCart(product.id, quantity);
          router.back();
        }}
        style={{ flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', paddingVertical: Inset.buttonV }}>
        <AppText weight="bold" size={15} color="#FFFFFF">
          Zum Warenkorb · {formatEuro(best.price * quantity)}
        </AppText>
      </Pressable>
    </View>
  );

  return (
    <SheetScroll footer={footer} contentContainerStyle={{ padding: Spacing.four, paddingTop: Spacing.five, gap: Spacing.five, paddingBottom: 160 }}>
        {/* Kopf, kompakt: Preisvergleich steht vor den sekundären Aktionen */}
        <View style={{ flexDirection: 'row', gap: Spacing.three }}>
          <View style={{ width: 64, height: 64, borderRadius: Radius.medium, backgroundColor: Colors.tile, overflow: 'hidden' }}>
            <Image source={product.imageUrl} style={{ flex: 1 }} contentFit="cover" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText weight="bold" size={11} color={Colors.textSecondary}>
              {product.brand.toUpperCase()}
            </AppText>
            <AppText weight="extrabold" size={18}>
              {product.name}
            </AppText>
            <AppText size={12} color={Colors.textSecondary}>
              {product.packageSize} · ab {unitPriceLabel(product, best.price)}
            </AppText>
          </View>
        </View>
        {product.imageCredit ? (
          <AppText size={11} color={Colors.textSecondary} style={{ marginTop: -Spacing.three }}>
            {product.imageCredit}
          </AppText>
        ) : null}

        {/* Bester Preis */}
        <View style={{ borderRadius: Radius.large, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card, padding: Inset.card, gap: Spacing.three }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
            <StoreBadge storeId={best.storeId} size="large" />
            <View style={{ flex: 1 }}>
              <AppText weight="bold" size={12} color={Colors.green}>
                BESTER PREIS IN DEINER NÄHE
              </AppText>
              <AppText weight="semibold" size={14}>
                {bestStore.name} · {bestStore.distanceKm.toLocaleString('de-DE')} km
              </AppText>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' }}>
            <AppText weight="extrabold" size={34} color={best.regularPrice ? Colors.deal : Colors.text}>
              {formatEuro(best.price)}
            </AppText>
            {best.regularPrice ? (
              <AppText size={15} color={Colors.textSecondary} style={{ textDecorationLine: 'line-through' }}>
                {formatEuro(best.regularPrice)}
              </AppText>
            ) : null}
            {discount ? <Pill tone="orange" label={`-${discount} %`} /> : null}
            {best.regularPrice ? <Pill tone="green" label={`${formatEuro(best.regularPrice - best.price)} gespart`} /> : null}
          </View>
          <AppText size={12} color={Colors.textSecondary}>
            {best.validUntil ? `gültig bis ${formatDate(best.validUntil)} · ` : ''}
            {sourceText(best)}
          </AppText>
          {!best.demo && isStale(best.observedAt) ? (
            <AppText size={12} weight="semibold" color={Colors.warning}>
              Möglicherweise veraltet – im Markt kann der Preis heute anders sein.
            </AppText>
          ) : null}
          {best.sourceUrl ? (
            <Pressable onPress={() => best.sourceUrl && Linking.openURL(best.sourceUrl)} hitSlop={6}>
              <AppText size={12} weight="bold" color={Colors.primary}>
                Beleg bei Open Prices ansehen ›
              </AppText>
            </Pressable>
          ) : null}
        </View>

        <PriceLevelPill level={level} percent={Math.abs(percentVsAverage)} />

        {/* Preisbeobachtungen bleiben strikt getrennt von der Anzeige. */}
        <Section title="Preise in deiner Nähe">
          <PriceRanking product={product} showAd={false} />
        </Section>

        {/* Sekundaere Aktionen, erst nach dem Preisvergleich */}
        <View style={{ flexDirection: 'row', gap: Spacing.three }}>
          <Pressable
            onPress={() => toggleFavorite(product.id)}
            accessibilityLabel={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingVertical: Inset.compact, borderRadius: Radius.large, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card }}>
            <Icon name={isFavorite ? { ios: 'heart.fill', android: 'favorite', web: 'favorite' } : { ios: 'heart', android: 'favorite_border', web: 'favorite_border' }} size={16} color={Colors.primary} />
            <AppText weight="bold" size={14}>
              {isFavorite ? 'Aus Favoriten' : 'Favorit'}
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => Share.share({ message: `${product.brand} ${product.name} ab ${formatEuro(best.price)} bei ${bestStore.name} – gefunden mit Korbwert` })}
            accessibilityLabel="Teilen"
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingVertical: Inset.compact, borderRadius: Radius.large, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card }}>
            <Icon name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }} size={16} color={Colors.textSecondary} />
            <AppText weight="bold" size={14}>
              Teilen
            </AppText>
          </Pressable>
        </View>

        {/* Preisalarm */}
        <Link href={{ pathname: '/preisalarm/[id]', params: { id: product.id } }} asChild>
          <Pressable
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.three,
              padding: Inset.row,
              borderRadius: Radius.large,
              borderWidth: 1,
              borderColor: Colors.border,
              backgroundColor: pressed ? Colors.tile : Colors.card,
            })}>
            <View style={{ width: 36, height: 36, borderRadius: Radius.medium, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }} size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText weight="bold" size={15}>
                {alarm ? 'Preisalarm aktiv' : 'Preisalarm setzen'}
              </AppText>
              <AppText size={12} color={Colors.textSecondary}>
                {alarm ? `Alarm bei unter ${formatEuro(alarm.targetPrice)}` : 'Wir melden uns, wenn der Preis fällt.'}
              </AppText>
            </View>
            <Icon name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={13} color="#B5B1AB" />
          </Pressable>
        </Link>

        {/* Preisverlauf, eingeklappt hinter Disclosure */}
        <Card style={{ gap: Spacing.four }}>
          <Pressable
            onPress={() => setHistoryOpen(!historyOpen)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            accessibilityLabel={historyOpen ? 'Preisverlauf einklappen' : 'Preisverlauf anzeigen'}>
            <AppText weight="extrabold" size={18}>
              Preisverlauf
            </AppText>
            <Icon name={historyOpen ? { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' } : { ios: 'chevron.down', android: 'keyboard_arrow_down', web: 'keyboard_arrow_down' }} size={16} color={Colors.textSecondary} />
          </Pressable>
          {historyOpen ? (
            <>
              <View style={{ flexDirection: 'row', backgroundColor: Colors.tile, borderRadius: Radius.pill, padding: Inset.segment }}>
                {(['8w', '6m'] as Range[]).map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => setRange(item)}
                    style={{ paddingHorizontal: Inset.chipH, paddingVertical: 6, borderRadius: Radius.pill, backgroundColor: range === item ? Colors.card : 'transparent' }}>
                    <AppText weight="bold" size={12} color={range === item ? Colors.text : Colors.textSecondary}>
                      {item === '8w' ? '8 Wochen' : '6 Monate'}
                    </AppText>
                  </Pressable>
                ))}
              </View>
              {range === '8w' ? (
                <PriceChart values={[...product.history, best.price]} />
              ) : (
                <View style={{ alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four }}>
                  <Icon name={{ ios: 'crown.fill', android: 'workspace_premium', web: 'workspace_premium' }} size={26} color={Colors.primary} />
                  <AppText weight="bold" size={15}>
                    Längerer Verlauf mit Korbwert Plus
                  </AppText>
                  <AppText size={13} color={Colors.textSecondary} style={{ textAlign: 'center' }}>
                    Bis zu 12 Monate Preisverlauf – bald verfügbar.
                  </AppText>
                </View>
              )}
              <AppText size={11} color={Colors.textSecondary}>
                {product.prices.some((price) => price.demo) ? 'Durchschnitt beobachteter Preise (Demo).' : 'Beobachtete Preise aus Open Prices.'} Keine Garantie für den Preis im Markt.
              </AppText>
            </>
          ) : null}
        </Card>

        {/* Produktinfos */}
        <Section title="Produktinfos">
          {product.info ? (
            <Card style={{ gap: Spacing.four }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' }}>
                {product.info.nutriScore ? <Pill tone="gray" label={`Nutri-Score ${product.info.nutriScore}`} /> : null}
                {product.info.labels.map((label) => (
                  <Pill key={label} tone="green" label={label} />
                ))}
              </View>
              <View>
                <AppText weight="bold" size={13} color={Colors.textSecondary} style={{ marginBottom: Spacing.two }}>
                  NÄHRWERTE PRO 100 G
                </AppText>
                {(
                  [
                    ['Energie', product.info.nutrition.energyKcal, 'kcal'],
                    ['Fett', product.info.nutrition.fat, 'g'],
                    ['Kohlenhydrate', product.info.nutrition.carbs, 'g'],
                    ['davon Zucker', product.info.nutrition.sugar, 'g'],
                    ['Eiweiß', product.info.nutrition.protein, 'g'],
                    ['Salz', product.info.nutrition.salt, 'g'],
                  ] as const
                )
                  .filter(([, amount]) => amount !== undefined)
                  .map(([label, amount, unit]) => [label, `${amount?.toLocaleString('de-DE')} ${unit}`])
                  .map(([label, value], index) => (
                  <View
                    key={label}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.two, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: Colors.border }}>
                    <AppText size={14} color={label === 'davon Zucker' ? Colors.textSecondary : Colors.text}>
                      {label}
                    </AppText>
                    <AppText weight="semibold" size={14}>
                      {value}
                    </AppText>
                  </View>
                ))}
              </View>
              {product.info.ingredients ? (
                <View style={{ gap: 4 }}>
                  <AppText weight="bold" size={13} color={Colors.textSecondary}>
                    ZUTATEN
                  </AppText>
                  <AppText size={14}>{product.info.ingredients}</AppText>
                </View>
              ) : null}
              <AppText size={12} color={Colors.textSecondary}>
                EAN {product.info.ean} · {product.info.source ?? 'Demo-Produktdaten, später aus Open Food Facts'}
              </AppText>
            </Card>
          ) : (
            <Card>
              <AppText size={14} color={Colors.textSecondary}>
                Für dieses Produkt folgen Nährwerte und Zutaten aus Open Food Facts.
              </AppText>
            </Card>
          )}
        </Section>

        {/* Alternativen */}
        {alternatives.length > 0 ? (
          <Section title="Günstigere Alternativen">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.three }}>
              {alternatives.map((item) => (
                <ProductCard key={item.id} product={item} width={140} />
              ))}
            </ScrollView>
          </Section>
        ) : null}

        {/* Woher kommt der Preis */}
        <View style={{ backgroundColor: Colors.tile, borderRadius: Radius.large, padding: Inset.card, gap: Spacing.two }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
            <Icon name={{ ios: 'info.circle', android: 'info', web: 'info' }} size={18} color={Colors.textSecondary} />
            <AppText weight="bold" size={15}>
              Woher kommt der Preis?
            </AppText>
          </View>
          <AppText size={13} color={Colors.textSecondary}>
            Preise stammen aus Händler-Prospekten, Open Prices und Meldungen der Community. Sie sind Beobachtungen,
            keine garantierten Marktpreise – im Markt kann der Preis abweichen. Aktuell zeigt die App Demo-Daten.
          </AppText>
          <Pressable
            onPress={() => router.push({ pathname: '/preis-melden/[id]', params: { id: product.id } })}
            hitSlop={6}>
            <AppText weight="bold" size={14} color={Colors.primary}>
              Preis melden
            </AppText>
          </Pressable>
        </View>
    </SheetScroll>
  );
}
