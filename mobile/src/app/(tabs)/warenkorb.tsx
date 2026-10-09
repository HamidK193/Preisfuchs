import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { EmptyState } from '@/components/system-states';
import { AppText, Card, DemoNotice, Icon, StoreBadge } from '@/components/ui';
import { Colors, Radius, Spacing, Inset } from '@/constants/theme';
import { products } from '@/data/products';
import { bestTwoStoreSplit, cheapestPrice, formatEuro, totalsPerStore } from '@/lib/pricing';
import { useAppState } from '@/state/app-state';

type Mode = 'ein-markt' | 'aufteilen';

// Haeufige Artikel als Vorschlag fuer eine leere Liste.
const STAPLES = ['milk_15', 'butter_250', 'bananas_1kg', 'pasta_500', 'coffee_500'];

// Kopf mit Listen-Auswahl und Teilen.
function ListHeader() {
  const { activeList, lists } = useAppState();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
      <Pressable
        onPress={() => router.push('/listen')}
        accessibilityRole="button"
        accessibilityLabel={`Liste ${activeList.name}, Listen wechseln`}
        style={{ flex: 1, gap: 2 }}>
        <AppText weight="bold" size={12} color={Colors.textSecondary} style={{ letterSpacing: 0.4 }}>
          {lists.length > 1 ? `WARENKORB · ${lists.length} LISTEN` : 'WARENKORB'}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AppText weight="extrabold" size={26} numberOfLines={1} style={{ flexShrink: 1 }}>
            {activeList.emoji} {activeList.name}
          </AppText>
          <Icon name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }} size={16} color={Colors.textSecondary} />
        </View>
      </Pressable>
      <Pressable
        onPress={() => router.push({ pathname: '/liste-teilen/[id]', params: { id: activeList.id } })}
        accessibilityLabel="Liste teilen"
        hitSlop={8}
        style={{ width: 40, height: 40, borderRadius: Radius.medium, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }} size={18} color={Colors.primary} />
      </Pressable>
    </View>
  );
}

function EmptyCart() {
  const { favorites, addToCart, activeStoreIds } = useAppState();
  const suggestions = [...new Set([...favorites, ...STAPLES])]
    .map((id) => products.find((product) => product.id === id))
    .filter((product) => product !== undefined)
    .slice(0, 6);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: Colors.background }}
      contentContainerStyle={{ padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.six }}>
      <ListHeader />
      <EmptyState title="Diese Liste ist noch leer" text="Füge Artikel hinzu – wir zeigen dir, wo dein Einkauf am günstigsten ist.">
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <Link href="/suche" asChild>
            <Pressable style={{ backgroundColor: Colors.primary, borderRadius: Radius.pill, paddingHorizontal: Inset.buttonH, paddingVertical: Inset.buttonV }}>
              <AppText weight="bold" color="#FFFFFF">
                Erste Artikel hinzufügen
              </AppText>
            </Pressable>
          </Link>
          <Pressable
            onPress={() => router.push('/scanner')}
            accessibilityLabel="Barcode scannen"
            style={{ width: 50, borderRadius: Radius.pill, backgroundColor: Colors.text, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={{ ios: 'barcode.viewfinder', android: 'barcode_scanner', web: 'barcode_scanner' }} size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </EmptyState>

      {suggestions.length > 0 ? (
        <View style={{ gap: Spacing.two }}>
          <AppText weight="extrabold" size={17}>
            Vorschläge
          </AppText>
          {suggestions.map((product) => (
            <View
              key={product.id}
              style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Inset.compact, borderRadius: Radius.large, borderWidth: 1, borderColor: Colors.border }}>
              <Image source={product.imageUrl} style={{ width: 44, height: 44, borderRadius: Radius.small }} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <AppText weight="bold" size={14} numberOfLines={1}>
                  {product.brand} {product.name}
                </AppText>
                <AppText size={12} color={Colors.textSecondary}>
                  {product.packageSize} · ab {formatEuro(cheapestPrice(product, activeStoreIds).price)}
                  {favorites.includes(product.id) ? ' · Favorit' : ''}
                </AppText>
              </View>
              <Pressable
                onPress={() => addToCart(product.id)}
                accessibilityLabel={`${product.name} hinzufügen`}
                hitSlop={6}
                style={{ width: 34, height: 34, borderRadius: Radius.pill, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={{ ios: 'plus', android: 'add', web: 'add' }} size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

export default function CartScreen() {
  const { cart, checked, setQuantity, toggleChecked, clearChecked, activeStoreIds, getStore } = useAppState();
  const [mode, setMode] = useState<Mode>('ein-markt');

  if (cart.length === 0) {
    return <EmptyCart />;
  }

  const storeIds = activeStoreIds;
  const totals = totalsPerStore(cart, products, storeIds);
  const best = totals[0];
  const split = bestTwoStoreSplit(cart, products, storeIds);
  const completeStores = totals.filter((item) => item.missingProductIds.length === 0);
  const singleBest = completeStores[0];
  const splitSaving = split && singleBest ? singleBest.total - split.total : 0;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: Colors.background }}
      contentContainerStyle={{ padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.six }}>
      <ListHeader />
      {checked.length > 0 ? (
        <Pressable onPress={clearChecked} hitSlop={8} style={{ alignSelf: 'flex-end' }}>
          <AppText weight="bold" size={14} color={Colors.primary}>
            Erledigte entfernen ({checked.length})
          </AppText>
        </Pressable>
      ) : null}

      {/* Artikel */}
      <View style={{ gap: Spacing.two }}>
        {cart.map((line) => {
          const product = products.find((item) => item.id === line.productId);
          if (!product) return null;
          const isChecked = checked.includes(product.id);
          const assignedStore = mode === 'aufteilen' && split ? split.assignments[product.id] : undefined;
          const price = cheapestPrice(product, activeStoreIds);
          return (
            <View
              key={line.productId}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.three,
                backgroundColor: Colors.card,
                borderRadius: Radius.large,
                padding: Inset.compact,
                borderWidth: 1,
                borderColor: Colors.border,
                opacity: isChecked ? 0.55 : 1,
              }}>
              <Pressable
                onPress={() => toggleChecked(product.id)}
                accessibilityLabel={isChecked ? 'Als nicht erledigt markieren' : 'Abhaken'}
                hitSlop={8}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  borderWidth: 2,
                  borderColor: isChecked ? Colors.green : Colors.border,
                  backgroundColor: isChecked ? Colors.green : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {isChecked ? (
                  <AppText weight="bold" size={14} color="#FFFFFF">
                    ✓
                  </AppText>
                ) : null}
              </Pressable>
              <Image source={product.imageUrl} style={{ width: 48, height: 48, borderRadius: Radius.small }} contentFit="cover" />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText weight="bold" size={14} numberOfLines={1} style={{ textDecorationLine: isChecked ? 'line-through' : 'none' }}>
                  {product.brand} {product.name}
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {assignedStore ? <StoreBadge storeId={assignedStore} /> : null}
                  <AppText size={12} color={Colors.textSecondary}>
                    {product.packageSize} · ab {formatEuro(price.price)}
                  </AppText>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border }}>
                <Pressable onPress={() => setQuantity(product.id, line.quantity - 1)} hitSlop={6} style={{ paddingHorizontal: Inset.stepperH, paddingVertical: Inset.stepperV }}>
                  <AppText weight="bold">−</AppText>
                </Pressable>
                <AppText weight="bold" size={14}>
                  {line.quantity}
                </AppText>
                <Pressable onPress={() => setQuantity(product.id, line.quantity + 1)} hitSlop={6} style={{ paddingHorizontal: Inset.stepperH, paddingVertical: Inset.stepperV }}>
                  <AppText weight="bold">+</AppText>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      {/* Marktvergleich */}
      <View style={{ gap: Spacing.three }}>
        <AppText weight="extrabold" size={19}>
          Wo kaufst du am günstigsten?
        </AppText>
        <View style={{ flexDirection: 'row', backgroundColor: Colors.tile, borderRadius: Radius.pill, padding: Inset.segment }}>
          {(['ein-markt', 'aufteilen'] as Mode[]).map((item) => (
            <Pressable
              key={item}
              onPress={() => setMode(item)}
              style={{ flex: 1, borderRadius: Radius.pill, paddingVertical: Inset.segmentItem, alignItems: 'center', backgroundColor: mode === item ? Colors.card : 'transparent' }}>
              <AppText weight="bold" size={13} color={mode === item ? Colors.text : Colors.textSecondary}>
                {item === 'ein-markt' ? 'Ein Markt' : '2 Märkte aufteilen'}
              </AppText>
            </Pressable>
          ))}
        </View>

        {mode === 'aufteilen' && split ? (
          <Card style={{ backgroundColor: Colors.green, borderColor: Colors.green, gap: Spacing.two }}>
            <AppText weight="bold" size={12} color="#BFE3CF">
              FUCHS-TIPP
            </AppText>
            <AppText weight="extrabold" size={20} color="#FFFFFF">
              {getStore(split.storeIds[0]).name} + {getStore(split.storeIds[1]).name}: {formatEuro(split.total)}
            </AppText>
            <AppText size={13} color="#DCEFE4">
              {splitSaving > 0
                ? `Spart ca. ${formatEuro(splitSaving)} gegenüber dem günstigsten Einzelmarkt.`
                : 'Ein einzelner Markt ist hier genauso günstig.'}{' '}
              Die Zuordnung siehst du oben an jedem Artikel.
            </AppText>
          </Card>
        ) : null}

        {mode === 'ein-markt'
          ? totals.map((item, index) => {
              const store = getStore(item.storeId);
              const isBest = item === best;
              const extra = item.total - best.total;
              return (
                <View
                  key={item.storeId}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: Spacing.three,
                    padding: Inset.row,
                    borderRadius: Radius.large,
                    backgroundColor: isBest ? Colors.greenSoft : Colors.card,
                    borderWidth: 1,
                    borderColor: isBest ? Colors.greenSoft : Colors.border,
                  }}>
                  <AppText weight="extrabold" size={15} color={isBest ? Colors.green : Colors.textSecondary} style={{ width: 18 }}>
                    {index + 1}.
                  </AppText>
                  <StoreBadge storeId={item.storeId} size="large" />
                  <View style={{ flex: 1 }}>
                    <AppText weight="bold" size={15}>
                      {store.name}
                      {isBest ? '  · Bester Einzelpreis' : ''}
                    </AppText>
                    <AppText size={12} color={item.missingProductIds.length ? Colors.warning : Colors.textSecondary}>
                      {item.availableCount} von {cart.length} Artikeln
                      {item.missingProductIds.length ? ' · nicht alles vorrätig' : ''}
                    </AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <AppText weight="extrabold" size={17} color={isBest ? Colors.green : Colors.text}>
                      {formatEuro(item.total)}
                    </AppText>
                    {!isBest && item.missingProductIds.length === 0 && extra > 0.004 ? (
                      <AppText size={11} weight="semibold" color={Colors.deal}>
                        +{formatEuro(extra)}
                      </AppText>
                    ) : null}
                  </View>
                </View>
              );
            })
          : null}

        <Link href="/marktvergleich" asChild>
          <Pressable
            style={({ pressed }) => ({
              borderRadius: Radius.pill,
              borderWidth: 1.5,
              borderColor: Colors.primary,
              paddingVertical: Inset.compact,
              alignItems: 'center',
              backgroundColor: pressed ? Colors.primarySoft : Colors.card,
            })}>
            <AppText weight="bold" size={14} color={Colors.primary}>
              Details & Route ansehen
            </AppText>
          </Pressable>
        </Link>

        <Link href={{ pathname: '/einkaufsmodus', params: { markt: best.storeId } }} asChild>
          <Pressable
            style={({ pressed }) => ({
              borderRadius: Radius.pill,
              paddingVertical: Inset.buttonV,
              alignItems: 'center',
              backgroundColor: pressed ? Colors.primaryDark : Colors.primary,
            })}>
            <AppText weight="bold" size={15} color="#FFFFFF">
              Einkaufsmodus starten · {getStore(best.storeId).name}
            </AppText>
          </Pressable>
        </Link>

        <AppText size={11} color={Colors.textSecondary}>
          Summen basieren auf beobachteten Preisen (Demo, Stand 02.10.2026). Fehlende Artikel sind nicht eingerechnet.
        </AppText>
      </View>

      <DemoNotice />
    </ScrollView>
  );
}
