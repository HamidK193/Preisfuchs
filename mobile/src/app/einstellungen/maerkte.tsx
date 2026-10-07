import { router } from 'expo-router';
import { Image, Pressable, Switch, View } from 'react-native';

import { Group, Page, SecondaryButton } from '@/components/settings';
import { StoreMap } from '@/components/store-map';
import { AppText, Icon, StoreBadge } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import { chains } from '@/data/stores';
import { useAppState } from '@/state/app-state';

export default function StoresScreen() {
  const { activeStoreIds, toggleStore, location, stores, branches, storesFromOsm } = useAppState();
  const missing = chains.filter((chain) => !stores.some((store) => store.id === chain.id));
  const place = [location.street, `${location.plz} ${location.city}`.trim()].filter(Boolean).join(', ');

  return (
    <Page>
      <View style={{ gap: Spacing.two }}>
        <AppText weight="bold" size={14} color={Colors.green}>
          {activeStoreIds.length} von {stores.length} aktiv
        </AppText>
        <AppText size={14} color={Colors.textSecondary}>
          Nur aktive Märkte werden im Preisvergleich und im Warenkorb berücksichtigt.
        </AppText>
        {!storesFromOsm ? (
          <AppText size={13} color={Colors.warning}>
            Das sind Beispielmärkte in Tübingen. Lege unter „Standort & Radius“ deinen Standort fest, um die Märkte in deiner
            Nähe zu laden.
          </AppText>
        ) : null}
      </View>

      <StoreMap
        center={{ latitude: location.latitude, longitude: location.longitude }}
        radiusKm={location.radiusKm}
        branches={branches}
        height={220}
        onPressBranch={(chainId) => router.push({ pathname: '/markt/[id]', params: { id: chainId } })}
      />

      <Group title={`Im Umkreis von ${location.radiusKm} km · ${place}`} footer="Mindestens ein Markt bleibt aktiv.">
        {stores.map((store, index) => {
          const active = activeStoreIds.includes(store.id);
          return (
            <Pressable
              key={store.id}
              onPress={() => router.push({ pathname: '/markt/[id]', params: { id: store.id } })}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.three,
                padding: Inset.row,
                backgroundColor: pressed ? Colors.tile : Colors.card,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: Colors.border,
              })}>
              <StoreBadge storeId={store.id} size="large" />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText weight="bold" size={15}>
                  {store.name}
                </AppText>
                <AppText size={12} color={Colors.textSecondary}>
                  {store.branchCount} {store.branchCount === 1 ? 'Filiale' : 'Filialen'} · nächste {store.distanceKm.toLocaleString('de-DE')} km
                </AppText>
              </View>
              <Switch value={active} onValueChange={() => toggleStore(store.id)} trackColor={{ true: Colors.primary }} />
              <Icon name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} color="#B5B1AB" size={13} />
            </Pressable>
          );
        })}
      </Group>

      {missing.length > 0 ? (
        <Group title="Nicht im Umkreis" footer="Für diese Ketten gibt es in deinem Umkreis keine Filiale. Vergrößere den Radius unter „Standort & Radius“.">
          {missing.map((chain, index) => (
            <View
              key={chain.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.three,
                padding: Inset.row,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: Colors.border,
                opacity: 0.5,
              }}>
              <Image source={chain.logo} style={{ width: 44, height: 44, borderRadius: Radius.small }} resizeMode="contain" />
              <AppText weight="bold" size={15} style={{ flex: 1 }}>
                {chain.name}
              </AppText>
            </View>
          ))}
        </Group>
      ) : null}

      <SecondaryButton label="Standort ändern" onPress={() => router.push('/einstellungen/standort')} />
    </Page>
  );
}
