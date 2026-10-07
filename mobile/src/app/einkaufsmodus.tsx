import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { AppText, Icon, StoreBadge } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import { categories, products } from '@/data/products';
import type { StoreId } from '@/data/stores';
import { formatEuro } from '@/lib/pricing';
import { useAppState } from '@/state/app-state';

// Einkaufen im Markt: Artikel nach Kategorie, grosse Zeilen zum Abhaken.
export default function ShoppingModeScreen() {
  const { markt } = useLocalSearchParams<{ markt: StoreId }>();
  const { cart, checked, toggleChecked, clearChecked, getStore } = useAppState();
  const store = getStore(markt);

  const lines = cart
    .map((line) => ({ line, product: products.find((item) => item.id === line.productId) }))
    .filter((entry) => entry.product !== undefined);
  const done = lines.filter(({ line }) => checked.includes(line.productId)).length;
  const estimate = lines.reduce((sum, { line, product }) => {
    const price = product?.prices.find((item) => item.storeId === markt)?.price;
    return price ? sum + price * line.quantity : sum;
  }, 0);

  const groups = categories
    .map((category) => ({ category, items: lines.filter(({ product }) => product?.categoryId === category.id) }))
    .filter((group) => group.items.length > 0);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Stack.Screen options={{ title: 'Einkaufsmodus', headerLargeTitle: false }} />
      <ScrollView contentContainerStyle={{ padding: Spacing.four, gap: Spacing.five, paddingBottom: 140 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
          <StoreBadge storeId={store.id} size="large" />
          <View style={{ flex: 1 }}>
            <AppText weight="extrabold" size={22}>
              Einkaufen bei {store.name}
            </AppText>
            <AppText size={13} color={Colors.textSecondary}>
              {done} von {lines.length} erledigt · ca. {formatEuro(estimate)}
            </AppText>
          </View>
        </View>

        <View style={{ height: 8, borderRadius: 4, backgroundColor: Colors.tile, overflow: 'hidden' }}>
          <View style={{ width: `${lines.length ? (done / lines.length) * 100 : 0}%`, height: '100%', backgroundColor: Colors.green }} />
        </View>

        {groups.map(({ category, items }) => (
          <View key={category.id} style={{ gap: Spacing.two }}>
            <AppText weight="bold" size={13} color={Colors.textSecondary} style={{ letterSpacing: 0.4 }}>
              {category.label.toUpperCase()}
            </AppText>
            {items.map(({ line, product }) => {
              if (!product) return null;
              const isChecked = checked.includes(product.id);
              const price = product.prices.find((item) => item.storeId === markt)?.price;
              return (
                <Pressable
                  key={product.id}
                  onPress={() => toggleChecked(product.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: Spacing.three,
                    padding: Inset.row,
                    minHeight: 72,
                    borderRadius: Radius.large,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    backgroundColor: isChecked ? Colors.tile : Colors.card,
                  }}>
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      borderWidth: 2,
                      borderColor: isChecked ? Colors.green : Colors.border,
                      backgroundColor: isChecked ? Colors.green : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    {isChecked ? <Icon name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={16} color="#FFFFFF" /> : null}
                  </View>
                  <Image source={product.imageUrl} style={{ width: 48, height: 48, borderRadius: Radius.small, opacity: isChecked ? 0.5 : 1 }} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <AppText
                      weight="bold"
                      size={16}
                      color={isChecked ? Colors.textSecondary : Colors.text}
                      style={{ textDecorationLine: isChecked ? 'line-through' : 'none' }}>
                      {line.quantity} × {product.brand} {product.name}
                    </AppText>
                    <AppText size={12} color={price ? Colors.textSecondary : Colors.warning}>
                      {product.packageSize}
                      {price ? ` · ${formatEuro(price)}` : ` · bei ${store.name} kein Preis bekannt`}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}

        <AppText size={11} color={Colors.textSecondary}>
          Geschätzte Summe aus beobachteten Preisen (Demo). Im Markt kann der Preis abweichen.
        </AppText>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: Inset.card, paddingBottom: Spacing.six, backgroundColor: Colors.card, borderTopWidth: 1, borderTopColor: Colors.border }}>
        <Pressable
          onPress={() => {
            clearChecked();
            router.back();
          }}
          style={({ pressed }) => ({ backgroundColor: pressed ? Colors.primaryDark : Colors.primary, borderRadius: Radius.pill, paddingVertical: Inset.buttonV, alignItems: 'center' })}>
          <AppText weight="bold" size={15} color="#FFFFFF">
            {done > 0 ? `Einkauf abschließen · ${done} erledigt entfernen` : 'Einkauf beenden'}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}
