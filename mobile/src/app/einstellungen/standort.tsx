import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import { Group, Page, PrimaryButton, SecondaryButton } from '@/components/settings';
import { StoreMap } from '@/components/store-map';
import { AppText, Icon, StoreBadge } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import { chains } from '@/data/stores';
import { findNearbyStores, type NearbyResult } from '@/lib/osm';
import { useAppState } from '@/state/app-state';

const RADIUS_OPTIONS = [2, 5, 10, 15, 25];

type Coordinates = { latitude: number; longitude: number };

const inputStyle = {
  borderWidth: 1,
  borderColor: Colors.border,
  borderRadius: Radius.medium,
  paddingHorizontal: Inset.card,
  height: 48,
  fontSize: 16,
  color: Colors.text,
} as const;

export default function LocationScreen() {
  const { location, setLocation, stores, branches } = useAppState();
  const [street, setStreet] = useState(location.street);
  const [plz, setPlz] = useState(location.plz);
  const [city, setCity] = useState(location.city);
  const [radiusKm, setRadiusKm] = useState(location.radiusKm);
  // Koordinaten der eingegebenen Adresse; undefined, sobald die Adresse geaendert wurde.
  const [coords, setCoords] = useState<Coordinates | undefined>({ latitude: location.latitude, longitude: location.longitude });
  const [result, setResult] = useState<NearbyResult | undefined>();
  const [busy, setBusy] = useState<'gps' | 'search' | undefined>();
  const [message, setMessage] = useState<string | undefined>();

  const validPlz = /^\d{5}$/.test(plz);
  const preview = result ?? { stores, branches };
  const missingChains = chains.filter((chain) => !preview.stores.some((store) => store.id === chain.id));

  const editAddress = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setCoords(undefined);
    setResult(undefined);
  };

  const search = async (center: Coordinates, radius: number) => {
    setBusy('search');
    setMessage(undefined);
    try {
      const found = await findNearbyStores(center, radius);
      setResult(found);
      if (found.stores.length === 0) {
        setMessage('In diesem Umkreis wurden keine Märkte der unterstützten Ketten gefunden. Vergrößere den Radius.');
      }
      return found;
    } catch {
      setMessage('Die Märkte konnten gerade nicht geladen werden. Prüfe deine Internetverbindung und versuche es erneut.');
      return undefined;
    } finally {
      setBusy(undefined);
    }
  };

  // Adresse in Koordinaten umwandeln (nur wenn noch keine vorliegen).
  const resolveCoords = async (): Promise<Coordinates | undefined> => {
    if (coords) return coords;
    const query = [street, `${plz} ${city}`.trim(), 'Deutschland'].filter(Boolean).join(', ');
    try {
      const [hit] = await Location.geocodeAsync(query);
      if (!hit) {
        setMessage('Diese Adresse wurde nicht gefunden. Prüfe Straße, PLZ und Ort.');
        return undefined;
      }
      const next = { latitude: hit.latitude, longitude: hit.longitude };
      setCoords(next);
      return next;
    } catch {
      setMessage('Die Adresse konnte nicht gesucht werden. Prüfe deine Internetverbindung.');
      return undefined;
    }
  };

  const useCurrentLocation = async () => {
    setMessage(undefined);
    setBusy('gps');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setMessage('Ohne Freigabe kannst du deine Adresse einfach selbst eingeben.');
        setBusy(undefined);
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const center = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      const [address] = await Location.reverseGeocodeAsync(center);
      setStreet([address?.street, address?.streetNumber].filter(Boolean).join(' '));
      setPlz(address?.postalCode ?? '');
      setCity(address?.city ?? '');
      setCoords(center);
      await search(center, radiusKm);
    } catch {
      setMessage('Der Standort ist gerade nicht verfügbar. Bitte gib deine Adresse selbst ein.');
      setBusy(undefined);
    }
  };

  const searchNearby = async () => {
    setMessage(undefined);
    const center = await resolveCoords();
    if (center) await search(center, radiusKm);
  };

  const changeRadius = async (value: number) => {
    setRadiusKm(value);
    if (coords) await search(coords, value);
  };

  const save = async () => {
    const center = await resolveCoords();
    if (!center) return;
    const found = result ?? (await search(center, radiusKm));
    if (!found || found.stores.length === 0) return;
    setLocation({ street: street.trim(), plz, city: city.trim(), radiusKm, ...center }, found);
    router.back();
  };

  return (
    <Page>
      <AppText size={14} color={Colors.textSecondary}>
        Preisfuchs sucht die Supermärkte rund um deine Adresse und vergleicht ihre Preise.
      </AppText>

      <Group title="Adresse">
        <View style={{ padding: Inset.card, gap: Spacing.three }}>
          <TextInput
            value={street}
            onChangeText={editAddress(setStreet)}
            placeholder="Straße und Hausnummer (optional)"
            placeholderTextColor={Colors.textSecondary}
            style={inputStyle}
          />
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            <TextInput
              value={plz}
              onChangeText={editAddress((text) => setPlz(text.replace(/\D/g, '').slice(0, 5)))}
              keyboardType="number-pad"
              placeholder="PLZ"
              placeholderTextColor={Colors.textSecondary}
              style={[inputStyle, { width: 110, fontWeight: '600' }]}
            />
            <TextInput
              value={city}
              onChangeText={editAddress(setCity)}
              placeholder="Ort"
              placeholderTextColor={Colors.textSecondary}
              style={[inputStyle, { flex: 1 }]}
            />
          </View>
          <Pressable onPress={useCurrentLocation} disabled={busy !== undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
            {busy === 'gps' ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <Icon name={{ ios: 'location.fill', android: 'my_location', web: 'my_location' }} size={16} color={Colors.primary} />
            )}
            <AppText weight="bold" size={14} color={Colors.primary}>
              Aktuellen Standort verwenden
            </AppText>
          </Pressable>
        </View>
      </Group>

      <Group title="Suchradius" footer="Dein Standort bleibt auf dem Gerät. Für die Marktsuche werden nur Koordinaten an OpenStreetMap gesendet.">
        <View style={{ padding: Inset.card, gap: Spacing.four }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {RADIUS_OPTIONS.map((value) => {
              const selected = value === radiusKm;
              return (
                <Pressable
                  key={value}
                  onPress={() => changeRadius(value)}
                  disabled={busy !== undefined}
                  style={{
                    paddingHorizontal: Inset.chipH,
                    paddingVertical: Inset.chipV,
                    borderRadius: Radius.pill,
                    borderWidth: 1,
                    borderColor: selected ? Colors.text : Colors.border,
                    backgroundColor: selected ? Colors.text : Colors.card,
                  }}>
                  <AppText weight="bold" size={13} color={selected ? '#FFFFFF' : Colors.text}>
                    {value} km
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {coords ? (
            <StoreMap center={coords} radiusKm={radiusKm} branches={preview.branches.filter((branch) => branch.distanceKm <= radiusKm)} />
          ) : (
            <View style={{ height: 120, borderRadius: Radius.large, backgroundColor: Colors.tile, alignItems: 'center', justifyContent: 'center', padding: Inset.card }}>
              <AppText size={13} color={Colors.textSecondary} style={{ textAlign: 'center' }}>
                Adresse geändert – tippe auf „Märkte in der Nähe suchen“, um die Karte zu aktualisieren.
              </AppText>
            </View>
          )}

          <SecondaryButton label={busy === 'search' ? 'Suche läuft …' : 'Märkte in der Nähe suchen'} onPress={searchNearby} />

          {message ? (
            <AppText size={13} color={Colors.warning}>
              {message}
            </AppText>
          ) : null}

          {preview.stores.length > 0 ? (
            <View style={{ backgroundColor: Colors.greenSoft, borderRadius: Radius.medium, padding: Inset.compact, gap: Spacing.two }}>
              <AppText weight="bold" size={14} color={Colors.green}>
                {preview.branches.filter((branch) => branch.distanceKm <= radiusKm).length} Filialen von {preview.stores.length} Ketten
                {result ? ' gefunden' : ' (aktuell gespeichert)'}
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
                {preview.stores.map((store) => (
                  <StoreBadge key={store.id} storeId={store.id} />
                ))}
              </View>
              {missingChains.length > 0 ? (
                <AppText size={12} color={Colors.green}>
                  Nicht im Umkreis: {missingChains.map((chain) => chain.name).join(', ')}
                </AppText>
              ) : null}
            </View>
          ) : null}
        </View>
      </Group>

      <PrimaryButton label={busy ? 'Bitte warten …' : 'Speichern'} disabled={!validPlz || busy !== undefined} onPress={save} />
      {!validPlz ? (
        <AppText size={12} color={Colors.textSecondary} style={{ textAlign: 'center', marginTop: -Spacing.three }}>
          Bitte gib eine fünfstellige PLZ ein.
        </AppText>
      ) : null}
    </Page>
  );
}
