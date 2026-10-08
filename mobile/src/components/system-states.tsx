import { ActivityIndicator, Pressable, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/settings';
import { AppText, FoxLogo, Icon } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import { formatDate } from '@/lib/pricing';
import { useAppState } from '@/state/app-state';

// Leerer Zustand mit grossem Fuchs, Titel, Text und optionalen Aktionen.
export function EmptyState({ title, text, children, style }: { title: string; text?: string; children?: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ alignItems: 'center', gap: Spacing.three, paddingVertical: Inset.empty }, style]}>
      <FoxLogo size={120} />
      <AppText weight="extrabold" size={19} style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      {text ? (
        <AppText size={14} color={Colors.textSecondary} style={{ textAlign: 'center', lineHeight: 20 }}>
          {text}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

// Ganzer Bildschirm bei einem unerwarteten Fehler.
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', padding: Spacing.five }}>
      <EmptyState
        title="Hier ist etwas schiefgelaufen"
        text="Der Fuchs hat sich verlaufen. Deine Daten sind sicher – versuch es einfach noch einmal.">
        <View style={{ alignSelf: 'stretch', marginTop: Spacing.three }}>
          <PrimaryButton label="Erneut versuchen" onPress={onRetry} />
        </View>
      </EmptyState>
    </SafeAreaView>
  );
}

// Hinweis, wenn keine Verbindung besteht: zeigt, wie alt die angezeigten Preise sind.
export function OfflineBanner({ style }: { style?: ViewStyle }) {
  const { priceData, reloadPrices } = useAppState();
  if (priceData.kind !== 'cached' && priceData.kind !== 'offline') {
    return null;
  }
  const text =
    priceData.kind === 'cached' && priceData.loadedAt
      ? `Keine Verbindung. Du siehst Preise vom ${formatDate(priceData.loadedAt.slice(0, 10))}.`
      : 'Keine Verbindung. Du siehst nur Demo-Daten.';

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.three,
          backgroundColor: '#FFF6E5',
          borderRadius: Radius.medium,
          padding: Inset.row,
          borderWidth: 1,
          borderColor: '#F3D9A6',
        },
        style,
      ]}>
      <Icon name={{ ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' }} size={18} color={Colors.warning} />
      <AppText size={13} style={{ flex: 1 }}>
        {text}
      </AppText>
      {priceData.reloading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : (
        <Pressable onPress={reloadPrices} hitSlop={8} accessibilityRole="button">
          <AppText weight="bold" size={13} color={Colors.primary}>
            Erneut laden
          </AppText>
        </Pressable>
      )}
    </View>
  );
}
