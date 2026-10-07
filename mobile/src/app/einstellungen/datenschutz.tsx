import { Alert, Share, View } from 'react-native';

import { Group, Page, Row, SecondaryButton, ToggleRow } from '@/components/settings';
import { AppText } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import { useAppState } from '@/state/app-state';

export default function PrivacyScreen() {
  const state = useAppState();
  const { consent, updateConsent, resetAllData } = state;

  const exportData = () => {
    const { cart, favorites, location, activeStoreIds, notifications, alarms } = state;
    Share.share({
      title: 'Preisfuchs-Daten',
      message: JSON.stringify({ cart, favorites, location, activeStoreIds, notifications, consent, alarms }, null, 2),
    });
  };

  const deleteData = () =>
    Alert.alert('Alle Daten löschen?', 'Warenkorb, Favoriten, Preisalarme und Einstellungen werden auf diesem Gerät gelöscht.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: resetAllData },
    ]);

  return (
    <Page>
      <View style={{ backgroundColor: Colors.tile, borderRadius: Radius.large, padding: Inset.card }}>
        <AppText size={14} color={Colors.textSecondary}>
          Preisfuchs finanziert sich über klar gekennzeichnete Anzeigen und das optionale Abo Preisfuchs Plus.
          Warenkorb, Favoriten und Preisalarme bleiben auf deinem Gerät, solange du kein Konto anlegst.
        </AppText>
      </View>

      <Group title="Einwilligungen" footer="Du kannst deine Auswahl jederzeit hier ändern.">
        <ToggleRow
          label="Notwendige Funktionen"
          subtitle="Speichern von Warenkorb, Favoriten und Einstellungen"
          value
          disabled
          onValueChange={() => undefined}
        />
        <ToggleRow
          label="Personalisierte Anzeigen"
          subtitle="Anzeigen passend zu deinen Interessen"
          value={consent.personalizedAds}
          onValueChange={(value) => updateConsent({ personalizedAds: value })}
        />
        <ToggleRow
          label="Anonyme Nutzungsstatistik"
          subtitle="Hilft uns, Suche und Preisvergleich zu verbessern"
          value={consent.analytics}
          onValueChange={(value) => updateConsent({ analytics: value })}
          last
        />
      </Group>

      {/* Ablehnen und Akzeptieren gleichwertig */}
      <View style={{ flexDirection: 'row', gap: Spacing.two, marginTop: -Spacing.two }}>
        <SecondaryButton label="Alle ablehnen" onPress={() => updateConsent({ personalizedAds: false, analytics: false })} style={{ flex: 1 }} />
        <SecondaryButton label="Alle akzeptieren" onPress={() => updateConsent({ personalizedAds: true, analytics: true })} style={{ flex: 1 }} />
      </View>

      <Group title="Deine Daten">
        <Row
          icon={{ ios: 'square.and.arrow.up', android: 'ios_share', web: 'ios_share' }}
          tint="#3B6FD8"
          label="Daten exportieren"
          subtitle="Als Text teilen oder speichern"
          onPress={exportData}
        />
        <Row
          icon={{ ios: 'trash.fill', android: 'delete', web: 'delete' }}
          tint={Colors.danger}
          label="Alle Daten löschen"
          subtitle="Setzt die App auf diesem Gerät zurück"
          danger
          onPress={deleteData}
          last
        />
      </Group>
    </Page>
  );
}
