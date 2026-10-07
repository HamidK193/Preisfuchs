import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, ScrollView, Switch, View } from 'react-native';

import { ProductCard } from '@/components/product-card';
import { Group, Page, PrimaryButton } from '@/components/settings';
import { StoreMap } from '@/components/store-map';
import { AppText, Icon, Pill, StoreBadge } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import { products } from '@/data/products';
import { parseOpeningHours, type StoreId } from '@/data/stores';
import { formatEuro, offerWeekLabel, totalsPerStore } from '@/lib/pricing';
import { useAppState } from '@/state/app-state';

const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

export default function StoreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: StoreId }>();
  const { cart, activeStoreIds, toggleStore, getStore, branches, storesFromOsm } = useAppState();
  const store = getStore(id);
  const hours = parseOpeningHours(store.openingHours);
  const now = new Date();
  const todayIndex = (now.getDay() + 6) % 7; // Montag = 0
  const minutes = now.getHours() * 60 + now.getMinutes();
  const open = hours ? (todayIndex !== 6 || hours.sunday) && minutes >= toMinutes(hours.opensAt) && minutes < toMinutes(hours.openUntil) : undefined;
  const total = totalsPerStore(cart, products, [store.id])[0];
  const offers = products.filter((product) => product.prices.some((price) => price.storeId === store.id && price.regularPrice));
  const active = activeStoreIds.includes(store.id);
  const chainBranches = branches.filter((branch) => branch.chainId === store.id);
  const nearby = store.branchCount > 0;

  return (
    <Page>
      <Stack.Screen options={{ title: store.name }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.four }}>
        <StoreBadge storeId={store.id} size="large" />
        <View style={{ flex: 1, gap: 6 }}>
          <AppText size={14} color={Colors.textSecondary}>
            {nearby ? `Nächste Filiale: ${store.address}` : 'Keine Filiale im Umkreis'}
          </AppText>
          {nearby ? (
            <View style={{ flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' }}>
              <Pill tone="gray" label={`${store.distanceKm.toLocaleString('de-DE')} km`} />
              {open !== undefined ? <Pill tone={open ? 'green' : 'red'} label={open ? `Geöffnet bis ${hours?.openUntil}` : 'Geschlossen'} /> : null}
              {store.branchCount > 1 ? <Pill tone="gray" label={`${store.branchCount} Filialen im Umkreis`} /> : null}
            </View>
          ) : null}
        </View>
      </View>

      {nearby ? (
        <>
          <StoreMap center={{ latitude: store.latitude, longitude: store.longitude }} radiusKm={1} branches={chainBranches} height={200} />
          <PrimaryButton
            label="Route zur nächsten Filiale"
            onPress={() => Linking.openURL(`https://maps.apple.com/?daddr=${store.latitude},${store.longitude}&q=${encodeURIComponent(store.name)}`)}
          />
        </>
      ) : null}

      <Group title="Im Preisvergleich">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Inset.row }}>
          <AppText weight="semibold" size={15} style={{ flex: 1 }}>
            {store.name} berücksichtigen
          </AppText>
          <Switch value={active} onValueChange={() => toggleStore(store.id)} disabled={!nearby} trackColor={{ true: Colors.primary }} />
        </View>
      </Group>

      {cart.length > 0 ? (
        <Link href="/marktvergleich" asChild>
          <Pressable style={({ pressed }) => ({ backgroundColor: pressed ? Colors.tile : Colors.greenSoft, borderRadius: Radius.large, padding: Inset.card, gap: 4 })}>
            <AppText weight="bold" size={12} color={Colors.green}>
              DEIN WARENKORB HIER
            </AppText>
            <AppText weight="extrabold" size={24} color={Colors.green}>
              {formatEuro(total.total)}
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText size={13} color={Colors.green}>
                {total.availableCount} von {cart.length} Artikeln verfügbar
              </AppText>
              <AppText weight="bold" size={13} color={Colors.primary}>
                Zum Marktvergleich ›
              </AppText>
            </View>
          </Pressable>
        </Link>
      ) : null}

      {nearby ? (
        <Group title="Öffnungszeiten" footer={storesFromOsm ? 'Quelle: OpenStreetMap. Angaben können abweichen.' : 'Beispielwerte.'}>
          {hours ? (
            WEEKDAYS.map((day, index) => {
              const today = index === todayIndex;
              const closed = index === 6 && !hours.sunday;
              return (
                <View
                  key={day}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Inset.card, paddingVertical: 10, backgroundColor: today ? Colors.primarySoft : Colors.card }}>
                  <AppText weight={today ? 'bold' : 'regular'} size={14}>
                    {day}
                    {today ? ' (heute)' : ''}
                  </AppText>
                  <AppText weight={today ? 'bold' : 'regular'} size={14} color={closed ? Colors.danger : Colors.text}>
                    {closed ? 'geschlossen' : `${hours.opensAt} – ${hours.openUntil}`}
                  </AppText>
                </View>
              );
            })
          ) : (
            <View style={{ padding: Inset.card }}>
              <AppText size={14} color={Colors.textSecondary}>
                {store.openingHours ?? 'Für diese Filiale sind keine Öffnungszeiten hinterlegt.'}
              </AppText>
            </View>
          )}
        </Group>
      ) : null}

      {offers.length > 0 ? (
        <View style={{ gap: Spacing.three }}>
          <View>
            <AppText weight="extrabold" size={19}>
              Angebote dieser Woche
            </AppText>
            <AppText size={12} color={Colors.textSecondary}>
              Gültig {offerWeekLabel()} · Prospekt (Demo)
            </AppText>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.three }}>
            {offers.map((product) => (
              <ProductCard key={product.id} product={product} width={140} storeId={store.id} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' }}>
        <Icon name={{ ios: 'info.circle', android: 'info', web: 'info' }} size={14} color={Colors.textSecondary} />
        <AppText size={12} color={Colors.textSecondary} style={{ flex: 1 }}>
          {storesFromOsm ? 'Filialen: © OpenStreetMap-Mitwirkende (ODbL).' : 'Beispiel-Filiale in Tübingen.'} Preise: Prospekt (Demo), Stand
          02.10.2026.
        </AppText>
      </View>
    </Page>
  );
}
