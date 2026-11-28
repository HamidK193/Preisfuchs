import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { HomeCategories, HomeHeader, HomeSlider } from '@/components/home-sections';
import { OfflineBanner } from '@/components/system-states';
import { DemoNotice } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { products } from '@/data/products';
import { discountPercent } from '@/lib/pricing';
import { useAppState } from '@/state/app-state';

export default function StartScreen() {
  const { activeStoreIds, stores, location } = useAppState();
  const nearbyIds = stores.filter((store) => activeStoreIds.includes(store.id) && store.distanceKm <= location.radiusKm).map((store) => store.id);
  const deals = products.flatMap((product) => {
    const price = product.prices.filter((item) => activeStoreIds.includes(item.storeId) && discountPercent(item)).sort((a, b) => a.price - b.price)[0];
    return price ? [{ product, price }] : [];
  }).sort((a, b) => (discountPercent(b.price) ?? 0) - (discountPercent(a.price) ?? 0)).slice(0, 12);
  const nearby = products.flatMap((product) => {
    const price = product.prices.filter((item) => nearbyIds.includes(item.storeId)).sort((a, b) => a.price - b.price)[0];
    return price ? [{ product, price }] : [];
  }).sort((a, b) => a.price.price - b.price.price).slice(0, 12);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: Colors.background }} contentContainerStyle={{ paddingBottom: Spacing.six, gap: Spacing.four }}>
      <HomeHeader />
      <View style={{ paddingHorizontal: Spacing.four }}><OfflineBanner /></View>
      <HomeCategories />
      <HomeSlider title="Angebotsbeobachtungen" items={deals} action="Alle" onAction={() => router.navigate('/angebote')} empty="Für deine Märkte liegen keine Angebotsbeobachtungen vor." />
      <HomeSlider title="Günstig in deiner Nähe" items={nearby} action="Standort" onAction={() => router.push('/einstellungen/standort')} empty="Wähle deinen Standort und Märkte, um Preisbeobachtungen im Umkreis zu sehen." />
      {deals.concat(nearby).some(({ price }) => price.demo) ? <DemoNotice style={{ marginHorizontal: Spacing.four }} /> : null}
    </ScrollView>
  );
}
