import { Image } from 'expo-image';
import { Linking, View } from 'react-native';
import { SheetScroll } from '@/components/sheet';
import { PrimaryButton, SecondaryButton } from '@/components/settings';
import { AppText } from '@/components/ui';
import type { Product } from '@/data/products';
import { Spacing } from '@/constants/theme';
import { useAppState } from '@/state/app-state';

// A real catalog entry can exist without any price observation.
export function CatalogProductSheet({ product }: { product: Product }) {
  const { addToCart, favorites, toggleFavorite } = useAppState();
  return (
    <SheetScroll contentContainerStyle={{ padding: Spacing.four, gap: Spacing.three }}>
      <Image source={product.imageUrl || undefined} contentFit="contain" style={{ height: 160 }} />
      <AppText weight="bold" size={22}>{product.brand} {product.name}</AppText>
      <AppText>{product.packageSize}</AppText>
      <AppText>Keine Preisbeobachtung vorhanden. Katalogdaten sind keine Preiszusage.</AppText>
      <AppText>{product.imageCredit ?? 'Produktdaten: Open Food Facts (ODbL)'}</AppText>
      {product.imageSourcePage ? <SecondaryButton label="Open Food Facts" onPress={() => Linking.openURL(product.imageSourcePage!)} /> : null}
      <View style={{ gap: Spacing.two }}>
        <PrimaryButton label="Zur Einkaufsliste" onPress={() => addToCart(product.id)} />
        <SecondaryButton label={favorites.includes(product.id) ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'} onPress={() => toggleFavorite(product.id)} />
      </View>
    </SheetScroll>
  );
}
