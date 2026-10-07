import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton, SecondaryButton } from '@/components/settings';
import { AppText, FoxLogo, Icon } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import { geocodeAddress, locateDevice, type Address, type Coordinates, type DeviceLocation } from '@/lib/locate';
import { findNearbyStores } from '@/lib/osm';
import { useAppState } from '@/state/app-state';

const RADIUS_OPTIONS = [2, 5, 10, 15, 25];

type Phase = 'asking' | 'searching' | 'manual';

const inputStyle = {
  borderWidth: 1,
  borderColor: Colors.border,
  borderRadius: Radius.medium,
  paddingHorizontal: Inset.card,
  height: 50,
  fontSize: 16,
  color: Colors.text,
  backgroundColor: Colors.card,
} as const;

// Erster Start: Standortfreigabe anfragen; bei Ablehnung Adresse eingeben lassen.
export function LocationSetup() {
  const { setLocation } = useAppState();
  const [phase, setPhase] = useState<Phase>('asking');
  const [message, setMessage] = useState<string | undefined>();
  const [address, setAddress] = useState<Address>({ street: '', plz: '', city: '' });
  const [radiusKm, setRadiusKm] = useState(5);

  const searchAndSave = async (coords: Coordinates, found: Address, radius: number) => {
    setPhase('searching');
    try {
      const nearby = await findNearbyStores(coords, radius);
      if (nearby.stores.length === 0) {
        setMessage(`Im Umkreis von ${radius} km wurden keine Märkte gefunden. Vergrößere den Radius.`);
        setAddress(found);
        setPhase('manual');
        return;
      }
      setLocation({ ...found, radiusKm: radius, ...coords }, nearby);
    } catch {
      setMessage('Die Märkte konnten nicht geladen werden. Prüfe deine Internetverbindung.');
      setAddress(found);
      setPhase('manual');
    }
  };

  const handleLocated = (result: DeviceLocation) => {
    if (result.status === 'granted') {
      searchAndSave(result.coords, result.address, radiusKm);
      return;
    }
    setMessage(
      result.status === 'denied'
        ? 'Kein Problem – gib einfach deine Adresse ein. Du kannst die Freigabe später in den iOS-Einstellungen erteilen.'
        : 'Dein Standort ist gerade nicht verfügbar. Gib deine Adresse ein.',
    );
    setPhase('manual');
  };

  const askForLocation = () => {
    setMessage(undefined);
    setPhase('asking');
    locateDevice().then(handleLocated);
  };

  // Direkt beim Start nach dem Standort fragen.
  useEffect(() => {
    let cancelled = false;
    locateDevice().then((result) => {
      if (!cancelled) handleLocated(result);
    });
    return () => {
      cancelled = true;
    };
    // Nur einmal beim ersten Anzeigen fragen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitAddress = async () => {
    setMessage(undefined);
    setPhase('searching');
    try {
      const coords = await geocodeAddress(address);
      if (!coords) {
        setMessage('Diese Adresse wurde nicht gefunden. Prüfe Straße, PLZ und Ort.');
        setPhase('manual');
        return;
      }
      await searchAndSave(coords, address, radiusKm);
    } catch {
      setMessage('Die Adresse konnte nicht gesucht werden. Prüfe deine Internetverbindung.');
      setPhase('manual');
    }
  };

  if (phase !== 'manual') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: Spacing.five, gap: Spacing.four }}>
        <FoxLogo size={96} />
        <AppText weight="extrabold" size={24} style={{ textAlign: 'center' }}>
          {phase === 'asking' ? 'Wo kaufst du ein?' : 'Suche Märkte in deiner Nähe …'}
        </AppText>
        <AppText size={15} color={Colors.textSecondary} style={{ textAlign: 'center' }}>
          {phase === 'asking'
            ? 'Preisfuchs braucht deinen Standort, um die Supermärkte in deiner Nähe zu finden. Er bleibt auf deinem Gerät.'
            : 'Einen Moment, wir laden die Filialen aus OpenStreetMap.'}
        </AppText>
        <ActivityIndicator color={Colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  const validPlz = /^\d{5}$/.test(address.plz);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: Spacing.five, gap: Spacing.four }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', gap: Spacing.three, marginTop: Spacing.five }}>
            <FoxLogo size={80} />
            <AppText weight="extrabold" size={26} style={{ textAlign: 'center' }}>
              Wo kaufst du ein?
            </AppText>
            {message ? (
              <AppText size={14} color={Colors.textSecondary} style={{ textAlign: 'center' }}>
                {message}
              </AppText>
            ) : null}
          </View>

          <TextInput
            value={address.street}
            onChangeText={(street) => setAddress({ ...address, street })}
            placeholder="Straße und Hausnummer (optional)"
            placeholderTextColor={Colors.textSecondary}
            style={inputStyle}
          />
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            <TextInput
              value={address.plz}
              onChangeText={(text) => setAddress({ ...address, plz: text.replace(/\D/g, '').slice(0, 5) })}
              keyboardType="number-pad"
              placeholder="PLZ"
              placeholderTextColor={Colors.textSecondary}
              style={[inputStyle, { width: 110, fontWeight: '600' }]}
            />
            <TextInput
              value={address.city}
              onChangeText={(city) => setAddress({ ...address, city })}
              placeholder="Ort"
              placeholderTextColor={Colors.textSecondary}
              style={[inputStyle, { flex: 1 }]}
            />
          </View>

          <AppText weight="bold" size={13} color={Colors.textSecondary}>
            UMKREIS
          </AppText>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {RADIUS_OPTIONS.map((value) => {
              const selected = value === radiusKm;
              return (
                <Pressable
                  key={value}
                  onPress={() => setRadiusKm(value)}
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

          <PrimaryButton label="Märkte suchen" disabled={!validPlz} onPress={submitAddress} />
          <SecondaryButton label="Doch Standort verwenden" onPress={askForLocation} />

          <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' }}>
            <Icon name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} size={13} color={Colors.textSecondary} />
            <AppText size={12} color={Colors.textSecondary} style={{ flex: 1 }}>
              Deine Adresse bleibt auf dem Gerät. Für die Marktsuche werden nur Koordinaten an OpenStreetMap gesendet.
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
