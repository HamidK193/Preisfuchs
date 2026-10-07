import { useEffect, useRef } from 'react';
import { Image, View } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';

import { AppText } from '@/components/ui';
import { Colors, Radius } from '@/constants/theme';
import { getChain, type Branch, type StoreId } from '@/data/stores';

type Props = {
  center: { latitude: number; longitude: number };
  radiusKm?: number;
  branches: Branch[];
  height?: number;
  onPressBranch?: (chainId: StoreId) => void;
};

// Google Maps braucht auf dem iPhone einen eigenen App-Build mit API-Schluessel
// (plugins.react-native-maps.iosGoogleMapsApiKey in app.json); in Expo Go laeuft nur Apple Maps.
// Sobald es den Build gibt, hier auf true stellen.
const USE_GOOGLE_MAPS = false;

// Sichtbarer Kartenausschnitt, sodass der Radius knapp hineinpasst.
function regionFor(center: { latitude: number; longitude: number }, radiusKm: number) {
  const latitudeDelta = (radiusKm * 2.4) / 111.32;
  const longitudeDelta = latitudeDelta / Math.cos((center.latitude * Math.PI) / 180);
  return { ...center, latitudeDelta, longitudeDelta };
}

// Apple Maps (iOS) mit Standort, Suchradius und je einem Logo-Marker pro Filiale.
export function StoreMap({ center, radiusKm = 2, branches, height = 260, onPressBranch }: Props) {
  const mapRef = useRef<MapView>(null);

  const { latitude, longitude } = center;
  useEffect(() => {
    mapRef.current?.animateToRegion(regionFor({ latitude, longitude }, radiusKm), 400);
  }, [latitude, longitude, radiusKm]);

  return (
    <View style={{ height, borderRadius: Radius.large, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border }}>
      <MapView ref={mapRef} provider={USE_GOOGLE_MAPS ? PROVIDER_GOOGLE : PROVIDER_DEFAULT} style={{ flex: 1 }} initialRegion={regionFor(center, radiusKm)} showsPointsOfInterests={false}>
        <Circle center={center} radius={radiusKm * 1000} strokeColor={Colors.primary} strokeWidth={2} fillColor={`${Colors.primary}1F`} />
        <Marker coordinate={center} title="Dein Standort" pinColor={Colors.primary} />
        {branches.map((branch) => (
          <Marker
            key={branch.key}
            coordinate={{ latitude: branch.latitude, longitude: branch.longitude }}
            title={getChain(branch.chainId).name}
            description={`${branch.address} · ${branch.distanceKm.toLocaleString('de-DE')} km`}
            onCalloutPress={onPressBranch ? () => onPressBranch(branch.chainId) : undefined}>
            <View style={{ padding: 2, backgroundColor: '#FFFFFF', borderRadius: Radius.small, borderWidth: 1, borderColor: Colors.border }}>
              <Image source={getChain(branch.chainId).logo} style={{ width: 26, height: 26, borderRadius: 3 }} resizeMode="contain" />
            </View>
          </Marker>
        ))}
      </MapView>
      <View style={{ position: 'absolute', right: 6, bottom: 4, backgroundColor: '#FFFFFFCC', borderRadius: 4, paddingHorizontal: 4 }}>
        <AppText size={9} color={Colors.textSecondary}>
          Filialen: © OpenStreetMap-Mitwirkende
        </AppText>
      </View>
    </View>
  );
}
