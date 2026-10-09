import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Page, PrimaryButton, SecondaryButton } from '@/components/settings';
import { EmptyState } from '@/components/system-states';
import { AppText, Card } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { getProduct } from '@/data/products';
import { parseSharedItems } from '@/lib/share-list';
import { useAppState } from '@/state/app-state';

// Ziel geteilter Listen-Links (preisfuchs://liste?n=…&a=…): Vorschau und Uebernehmen.
export default function ImportListScreen() {
  const { n, e, a } = useLocalSearchParams<{ n?: string; e?: string; a?: string }>();
  const { createList } = useAppState();
  const lines = parseSharedItems(a);
  const known = lines.filter((line) => getProduct(line.productId));
  const unknownCount = lines.length - known.length;
  const name = n?.trim() || 'Geteilte Liste';

  if (known.length === 0) {
    return (
      <Page>
        <EmptyState
          title="Liste nicht lesbar"
          text="In diesem Link stehen keine Artikel, die Preisfuchs kennt. Vielleicht ist er unvollständig.">
          <SecondaryButton label="Zum Warenkorb" onPress={() => router.replace('/warenkorb')} />
        </EmptyState>
      </Page>
    );
  }

  return (
    <Page>
      <AppText weight="extrabold" size={24}>
        {e ?? '🛒'} {name}
      </AppText>
      <AppText size={14} color={Colors.textSecondary}>
        Jemand hat diese Einkaufsliste mit dir geteilt. Du bekommst eine eigene Kopie auf diesem Gerät.
      </AppText>
      <Card style={{ gap: Spacing.two }}>
        {known.map((line) => {
          const product = getProduct(line.productId)!;
          return (
            <View key={line.productId} style={{ flexDirection: 'row', gap: Spacing.two }}>
              <AppText weight="bold" size={14}>
                {line.quantity} ×
              </AppText>
              <AppText size={14} style={{ flex: 1 }}>
                {product.brand} {product.name} · {product.packageSize}
              </AppText>
            </View>
          );
        })}
      </Card>
      {unknownCount > 0 ? (
        <AppText size={12} color={Colors.warning}>
          {unknownCount} {unknownCount === 1 ? 'Artikel ist' : 'Artikel sind'} hier noch nicht bekannt und werden nicht übernommen.
        </AppText>
      ) : null}
      <PrimaryButton
        label="Als neue Liste übernehmen"
        onPress={() => {
          createList(name, e ?? '🛒', known);
          router.replace('/warenkorb');
        }}
      />
    </Page>
  );
}
