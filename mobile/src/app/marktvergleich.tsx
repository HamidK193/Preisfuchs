import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { Page, PrimaryButton } from '@/components/settings';
import { AppText, Icon, StoreBadge } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import { DEMO_DATA_DATE, products } from '@/data/products';
import type { Store } from '@/data/stores';
import { bestTwoStoreSplit, formatDate, formatEuro, totalsPerStore } from '@/lib/pricing';
import { useAppState } from '@/state/app-state';

type Mode = 'ein-markt' | 'aufteilen';

const productName = (id: string) => {
  const product = products.find((item) => item.id === id);
  return product ? `${product.brand} ${product.name}` : id;
};

const openRoute = (store: Store) => {
  Linking.openURL(`https://maps.apple.com/?daddr=${encodeURIComponent(`${store.name}, ${store.address}`)}`);
};

export default function ComparisonScreen() {
  const { cart, activeStoreIds, getStore } = useAppState();
  const [mode, setMode] = useState<Mode>('ein-markt');
  const [expanded, setExpanded] = useState<Store['id'] | undefined>();

  if (cart.length === 0) {
    return (
      <Page>
        <AppText size={15} color={Colors.textSecondary}>
          Dein Warenkorb ist leer. Füge Artikel hinzu, um Märkte zu vergleichen.
        </AppText>
      </Page>
    );
  }

  const totals = totalsPerStore(cart, products, activeStoreIds);
  const split = bestTwoStoreSplit(cart, products, activeStoreIds);
  const singleBest = totals.find((item) => item.missingProductIds.length === 0);
  const saving = split && singleBest ? singleBest.total - split.total : 0;

  return (
    <Page>
      <AppText size={14} color={Colors.textSecondary}>
        {cart.length} Artikel im Warenkorb · {activeStoreIds.length} aktive Märkte
      </AppText>

      <View style={{ flexDirection: 'row', backgroundColor: Colors.tile, borderRadius: Radius.pill, padding: Inset.segment }}>
        {(['ein-markt', 'aufteilen'] as Mode[]).map((item) => (
          <Pressable
            key={item}
            onPress={() => setMode(item)}
            style={{ flex: 1, borderRadius: Radius.pill, paddingVertical: Inset.segmentItem, alignItems: 'center', backgroundColor: mode === item ? Colors.card : 'transparent' }}>
            <AppText weight="bold" size={13} color={mode === item ? Colors.text : Colors.textSecondary}>
              {item === 'ein-markt' ? 'Ein Markt' : '2 Märkte'}
            </AppText>
          </Pressable>
        ))}
      </View>

      {mode === 'aufteilen' ? (
        split ? (
          <View style={{ backgroundColor: Colors.green, borderRadius: Radius.large, padding: Inset.card, gap: Spacing.three }}>
            <AppText weight="bold" size={12} color="#BFE3CF">
              FUCHS-TIPP
            </AppText>
            <AppText weight="extrabold" size={22} color="#FFFFFF">
              {getStore(split.storeIds[0]).name} + {getStore(split.storeIds[1]).name}: {formatEuro(split.total)}
            </AppText>
            <AppText size={13} color="#DCEFE4">
              {saving > 0.004 ? `Spart ca. ${formatEuro(saving)} gegenüber dem günstigsten Einzelmarkt.` : 'Ein einzelner Markt ist hier genauso günstig.'}
            </AppText>
            {split.storeIds.map((storeId) => {
              const items = Object.entries(split.assignments).filter(([, store]) => store === storeId);
              return (
                <View key={storeId} style={{ backgroundColor: '#FFFFFF', borderRadius: Radius.medium, padding: Inset.compact, gap: Spacing.two }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                    <StoreBadge storeId={storeId} />
                    <AppText weight="bold" size={14}>
                      {getStore(storeId).name} · {items.length} Artikel
                    </AppText>
                  </View>
                  {items.map(([productId]) => (
                    <AppText key={productId} size={13} color={Colors.textSecondary}>
                      • {productName(productId)}
                    </AppText>
                  ))}
                </View>
              );
            })}
            <Pressable
              onPress={() => openRoute(getStore(split.storeIds[0]))}
              style={{ backgroundColor: Colors.primary, borderRadius: Radius.pill, paddingVertical: Inset.buttonV, alignItems: 'center' }}>
              <AppText weight="bold" size={15} color="#FFFFFF">
                Route zu {getStore(split.storeIds[0]).name} starten
              </AppText>
            </Pressable>
          </View>
        ) : (
          <AppText size={14} color={Colors.textSecondary}>
            Mit zwei Märkten lässt sich dein Warenkorb nicht vollständig abdecken.
          </AppText>
        )
      ) : (
        <View style={{ gap: Spacing.three }}>
          {totals.map((item, index) => {
            const store = getStore(item.storeId);
            const isBest = index === 0;
            const open = expanded === item.storeId;
            return (
              <Pressable
                key={item.storeId}
                onPress={() => setExpanded(open ? undefined : item.storeId)}
                style={{
                  padding: Inset.card,
                  borderRadius: Radius.large,
                  borderWidth: 1,
                  borderColor: isBest ? Colors.greenSoft : Colors.border,
                  backgroundColor: isBest ? Colors.greenSoft : Colors.card,
                  gap: Spacing.three,
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
                  <StoreBadge storeId={item.storeId} size="large" />
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText weight="bold" size={16}>
                      {store.name}
                      {isBest ? '  · Günstigster Markt' : ''}
                    </AppText>
                    <AppText size={12} color={item.missingProductIds.length ? Colors.warning : Colors.textSecondary}>
                      {item.availableCount} von {cart.length} Artikeln
                      {item.missingProductIds.length ? ' · nicht alles vorrätig' : ''}
                    </AppText>
                  </View>
                  <AppText weight="extrabold" size={18} color={isBest ? Colors.green : Colors.text}>
                    {formatEuro(item.total)}
                  </AppText>
                  {item.missingProductIds.length ? (
                    <Icon
                      name={open ? { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' } : { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
                      size={13}
                      color={Colors.textSecondary}
                    />
                  ) : null}
                </View>
                {open && item.missingProductIds.length ? (
                  <View style={{ gap: 4 }}>
                    <AppText weight="bold" size={12} color={Colors.textSecondary}>
                      FEHLT BEI {store.name.toUpperCase()}
                    </AppText>
                    {item.missingProductIds.map((productId) => (
                      <AppText key={productId} size={13}>
                        • {productName(productId)}
                      </AppText>
                    ))}
                  </View>
                ) : null}
                {isBest ? <PrimaryButton label={`Route zu ${store.name}`} onPress={() => openRoute(store)} /> : null}
              </Pressable>
            );
          })}
        </View>
      )}

      <AppText size={12} color={Colors.textSecondary}>
        Summen basieren auf beobachteten Preisen (Demo, Stand {formatDate(DEMO_DATA_DATE)}). Fehlende Artikel sind nicht
        eingerechnet.
      </AppText>
    </Page>
  );
}
