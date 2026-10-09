import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton, SecondaryButton } from '@/components/settings';
import { AppText, Card, FoxLogo, StoreBadge } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { formatEuro } from '@/lib/pricing';
import { useAppState } from '@/state/app-state';

// Einkauf abgeschlossen: Zusammenfassung mit geschaetzter Summe und Ersparnis.
export default function TripDoneScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips, getStore, activeList } = useAppState();
  const trip = trips.find((item) => item.id === id);
  const remaining = activeList.lines.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background, padding: Spacing.five, justifyContent: 'center', gap: Spacing.five }}>
      <View style={{ alignItems: 'center', gap: Spacing.three }}>
        <FoxLogo size={110} />
        <AppText weight="extrabold" size={26} style={{ textAlign: 'center' }}>
          Einkauf erledigt!
        </AppText>
        {trip ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
            <StoreBadge storeId={trip.storeId} />
            <AppText size={14} color={Colors.textSecondary}>
              {getStore(trip.storeId).name} · {trip.listName}
            </AppText>
          </View>
        ) : null}
      </View>

      {trip ? (
        <Card style={{ gap: Spacing.three }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText size={15}>Artikel</AppText>
            <AppText weight="bold" size={15}>
              {trip.itemCount}
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText size={15}>Summe (geschätzt)</AppText>
            <AppText weight="bold" size={15}>
              ca. {formatEuro(trip.total)}
            </AppText>
          </View>
          {trip.estimatedSaving >= 0.01 ? (
            <View style={{ backgroundColor: Colors.greenSoft, borderRadius: 5, padding: Spacing.three, gap: 2 }}>
              <AppText weight="extrabold" size={20} color={Colors.green}>
                ca. {formatEuro(trip.estimatedSaving)} gespart
              </AppText>
              <AppText size={12} color={Colors.green}>
                Schätzung im Vergleich zum Durchschnitt deiner aktiven Märkte
              </AppText>
            </View>
          ) : null}
          <AppText size={11} color={Colors.textSecondary}>
            Berechnet aus beobachteten Preisen, nicht aus deinem Kassenbon. Der tatsächliche Betrag kann abweichen.
            {trip.unpricedCount > 0 ? ` ${trip.unpricedCount} Artikel ohne bekannten Preis sind nicht eingerechnet.` : ''}
          </AppText>
        </Card>
      ) : null}

      <View style={{ gap: Spacing.two }}>
        <PrimaryButton label="Fertig" onPress={() => router.dismissTo('/warenkorb')} />
        {remaining > 0 ? (
          <SecondaryButton
            label={`Noch ${remaining} ${remaining === 1 ? 'Artikel' : 'Artikel'} auf der Liste`}
            onPress={() => router.dismissTo('/warenkorb')}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}
