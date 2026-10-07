import { Image } from 'expo-image';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, Text, View, type TextProps, type ViewStyle } from 'react-native';

import { Colors, FontWeights, Radius, Spacing, Inset } from '@/constants/theme';
import { getChain, type StoreId } from '@/data/stores';
import type { PriceObservation } from '@/data/products';
import { isStale } from '@/lib/prices';
import { formatDate, type PriceLevel } from '@/lib/pricing';

type Weight = keyof typeof FontWeights;

export function AppText({
  weight = 'regular',
  size = 15,
  color = Colors.text,
  style,
  ...props
}: TextProps & { weight?: Weight; size?: number; color?: string }) {
  return <Text {...props} style={[{ fontWeight: FontWeights[weight], fontSize: size, color }, style]} />;
}

export type IconName = SymbolViewProps['name'];

// SF Symbol auf iOS, Material Symbol auf Android.
export function Icon({ name, size = 18, color = Colors.text }: { name: IconName; size?: number; color?: string }) {
  return <SymbolView name={name} tintColor={color} size={size} />;
}

export function FoxLogo({ size = 36 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: Colors.foxSoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontSize: size * 0.62 }}>🦊</Text>
    </View>
  );
}

// Haendler-Logo (Wikimedia Commons, gemeinfrei, Marke des jeweiligen Haendlers).
export function StoreBadge({ storeId, size = 'small' }: { storeId: StoreId; size?: 'small' | 'large' }) {
  const store = getChain(storeId);
  // Alle Logos im gleichen Quadrat, damit breite Logos wie Rewe nicht hervorstechen.
  const height = size === 'large' ? 44 : 22;
  return (
    <Image
      source={store.logo}
      accessibilityLabel={store.name}
      style={{ height, width: height, borderRadius: Radius.small }}
      contentFit="contain"
    />
  );
}

export function SectionHeader({ title, meta, action, onAction }: { title: string; meta?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: Spacing.two }}>
      <View style={{ flexShrink: 1 }}>
        <AppText weight="extrabold" size={19}>
          {title}
        </AppText>
        {meta ? (
          <AppText size={12} color={Colors.textSecondary}>
            {meta}
          </AppText>
        ) : null}
      </View>
      {action ? (
        <Pressable onPress={onAction} disabled={!onAction} hitSlop={8}>
          <AppText weight="bold" size={14} color={Colors.primary}>
            {action}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

// Quelle und Datum; echte Preise mit Ort, alte als moeglicherweise veraltet.
export function sourceText(observation: PriceObservation): string {
  if (observation.demo) {
    return `${observation.source} (Demo) · Stand: ${formatDate(observation.observedAt)}`;
  }
  const place = observation.locationLabel ? ` · ${observation.locationLabel}` : '';
  return `${observation.source}${place} · Stand: ${formatDate(observation.observedAt)}`;
}

export function SourceLine({ observation }: { observation: PriceObservation }) {
  const stale = !observation.demo && isStale(observation.observedAt);
  return (
    <AppText size={11} color={stale ? Colors.warning : Colors.textSecondary}>
      {sourceText(observation)}
      {stale ? ' · möglicherweise veraltet' : ''}
    </AppText>
  );
}

export function Pill({ label, tone }: { label: string; tone: 'green' | 'orange' | 'gray' | 'red' }) {
  const palette = {
    green: { bg: Colors.greenSoft, fg: Colors.greenText },
    orange: { bg: Colors.primary, fg: '#FFFFFF' },
    gray: { bg: Colors.tile, fg: Colors.textSecondary },
    red: { bg: '#FBE4E1', fg: Colors.danger },
  }[tone];
  return (
    <View style={{ backgroundColor: palette.bg, borderRadius: Radius.pill, paddingHorizontal: Inset.pillH, paddingVertical: Inset.pillV, alignSelf: 'flex-start' }}>
      <AppText weight="bold" size={11} color={palette.fg}>
        {label}
      </AppText>
    </View>
  );
}

export function PriceLevelPill({ level, percent }: { level: PriceLevel; percent: number }) {
  if (level === 'günstig') {
    return <Pill tone="green" label={`Gerade günstig · ${percent} % unter Ø`} />;
  }
  if (level === 'teuer') {
    return <Pill tone="red" label={`Gerade teuer · +${percent} % über Ø`} />;
  }
  return <Pill tone="gray" label="Normaler Preis" />;
}

export function DemoNotice({ style }: { style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          gap: Spacing.two,
          backgroundColor: Colors.tile,
          borderRadius: Radius.medium,
          padding: Inset.row,
        },
        style,
      ]}>
      <Icon name={{ ios: 'info.circle', android: 'info', web: 'info' }} size={16} color={Colors.textSecondary} />
      <AppText size={12} color={Colors.textSecondary} style={{ flex: 1 }}>
        Demo-Daten zum Testen des Designs. Preise sind Beobachtungen, keine garantierten Marktpreise –
        im Markt kann der Preis abweichen.
      </AppText>
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          backgroundColor: Colors.card,
          borderRadius: Radius.large,
          padding: Inset.card,
          borderWidth: 1,
          borderColor: Colors.border,
        },
        style,
      ]}>
      {children}
    </View>
  );
}
