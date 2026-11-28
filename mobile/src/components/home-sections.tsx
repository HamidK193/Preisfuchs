import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { ProductCard } from '@/components/product-card';
import { AppText, Icon, SectionHeader } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import { categories, type Product, type PriceObservation } from '@/data/products';
import { useAppState } from '@/state/app-state';

export function HomeHeader() {
  const { location, unreadCount } = useAppState();
  return (
    <View style={{ paddingHorizontal: Spacing.four, gap: Spacing.three }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Standort und Radius ändern" onPress={() => router.push('/einstellungen/standort')}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: Spacing.two }}>
          <Icon name={{ ios: 'location.fill', android: 'location_on', web: 'location_on' }} size={18} />
          <AppText weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {location.plz ? `${location.plz} ${location.city} · ${location.radiusKm} km` : 'Standort wählen'}
          </AppText>
          <Icon name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }} size={12} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={unreadCount ? `Benachrichtigungen, ${unreadCount} ungelesen` : 'Benachrichtigungen'}
          onPress={() => router.push('/benachrichtigungen')} style={{ padding: Spacing.three }}>
          <Icon name={{ ios: 'bell', android: 'notifications', web: 'notifications' }} size={22} />
          {unreadCount ? <AppText size={10} style={{ position: 'absolute', right: 0, top: 0 }}>{unreadCount}</AppText> : null}
        </Pressable>
      </View>
      <View
        style={{ height: 52, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Inset.card, borderRadius: Radius.large, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card }}>
        <Icon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={18} color={Colors.textSecondary} />
        <TextInput accessibilityLabel="Produkt oder Marke suchen" placeholder="Produkt oder Marke suchen"
          placeholderTextColor={Colors.textSecondary} returnKeyType="search" autoCorrect={false}
          onFocus={() => router.navigate({ pathname: '/suche', params: { focus: String(Date.now()) } })}
          style={{ flex: 1, height: '100%', fontSize: 16, color: Colors.text }} />
      </View>
    </View>
  );
}

export function HomeCategories() {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.three, paddingHorizontal: Spacing.four }}>
      {categories.map((category) => (
        <Link key={category.id} href={{ pathname: '/kategorie/[id]', params: { id: category.id } }} asChild>
          <Pressable accessibilityRole="button" accessibilityLabel={category.label} style={{ alignItems: 'center', width: 76, gap: 6 }}>
            <Image source={category.imageUrl} style={{ width: 64, height: 64, borderRadius: 32 }} contentFit="cover" />
            <AppText weight="semibold" size={11} style={{ textAlign: 'center' }}>{category.label}</AppText>
          </Pressable>
        </Link>
      ))}
    </ScrollView>
  );
}

export function HomeSlider({ title, items, action, onAction, empty }: {
  title: string; items: { product: Product; price: PriceObservation }[]; action: string; onAction: () => void; empty: string;
}) {
  return (
    <View style={{ gap: Spacing.three }}>
      <View style={{ paddingHorizontal: Spacing.four }}><SectionHeader title={title} action={action} onAction={onAction} /></View>
      {items.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.three, paddingHorizontal: Spacing.four }}>
          {items.map(({ product, price }) => <ProductCard key={product.id} product={product} storeId={price.storeId} />)}
        </ScrollView>
      ) : <AppText size={13} color={Colors.textSecondary} style={{ paddingHorizontal: Spacing.four }}>{empty}</AppText>}
    </View>
  );
}
