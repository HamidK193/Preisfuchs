import { ActivityIndicator, Pressable, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/settings';
import { AppText, FoxLogo, Icon } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import { formatDate } from '@/lib/pricing';
import { useAppState } from '@/state/app-state';

type ListStateProps = {
  status: 'loading' | 'empty' | 'offline';
  title?: string;
  text?: string;
  loadedAt?: string;
  onRetry?: () => void;
  actionLabel?: string;
  children?: React.ReactNode;
  compact?: boolean;
};

// A common loading, empty or offline treatment for catalog and list screens.
export function ListState({ status, title, text, loadedAt, onRetry, actionLabel, children, compact }: ListStateProps) {
  if (status === 'loading') {
    return (
      <View accessibilityLabel="Produkte werden geladen" accessibilityRole="progressbar" style={{ flexDirection: 'row', gap: Spacing.three, paddingHorizontal: compact ? Spacing.four : 0 }}>
        {[0, 1].map((item) => (
          <View key={item} style={{ width: compact ? 148 : '100%', gap: Spacing.two }}>
            <View accessibilityLabel="Produktbild-Platzhalter" accessibilityRole="image" style={{ aspectRatio: 1, borderRadius: Radius.large, backgroundColor: Colors.tile }} />
            <View style={{ height: 12, width: '72%', borderRadius: Radius.pill, backgroundColor: Colors.tile }} />
            <View style={{ height: 10, width: '48%', borderRadius: Radius.pill, backgroundColor: Colors.tile }} />
          </View>
        ))}
      </View>
    );
  }

  if (status === 'offline') {
    const dated = loadedAt ? `Datenstand: ${formatDate(loadedAt.slice(0, 10))}.` : undefined;
    const offlineText = [text ?? 'Keine Verbindung. Du siehst zuletzt gespeicherte Daten.', dated].filter(Boolean).join(' ');
    return (
      <EmptyState title={title ?? 'Gerade offline'} text={offlineText} style={compact ? { paddingVertical: Spacing.two } : undefined}>
        {children}
        {onRetry ? <ListStateAction label={actionLabel ?? 'Erneut versuchen'} onPress={onRetry} /> : null}
      </EmptyState>
    );
  }

  return (
    <EmptyState title={title ?? 'Noch keine Produkte'} text={text ?? 'Hier gibt es noch nichts zu sehen.'} style={compact ? { paddingVertical: Spacing.two } : undefined}>
      {children}
      {onRetry ? <ListStateAction label={actionLabel ?? 'Anderen Begriff versuchen'} onPress={onRetry} /> : null}
    </EmptyState>
  );
}

function ListStateAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ alignItems: 'center', borderRadius: Radius.pill, backgroundColor: Colors.primary, paddingHorizontal: Inset.buttonH, paddingVertical: Inset.buttonV }}>
      <AppText weight="bold" size={14} color="#FFFFFF">{label}</AppText>
    </Pressable>
  );
}

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
