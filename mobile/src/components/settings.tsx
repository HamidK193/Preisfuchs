import { Pressable, ScrollView, Switch, View, type ViewStyle } from 'react-native';

import { AppText, Icon, type IconName } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';

const ICON_SIZE = 36;

// Scrollbare Unterseite unter dem grossen iOS-Titel.
export function Page({ children, contentStyle }: { children: React.ReactNode; contentStyle?: ViewStyle }) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: Colors.background }}
      contentContainerStyle={[{ padding: Spacing.four, gap: Spacing.five, paddingBottom: Spacing.six }, contentStyle]}>
      {children}
    </ScrollView>
  );
}

// Gruppe wie in den iOS-Einstellungen: kleine Ueberschrift, Rahmen, optionaler Fusstext.
export function Group({ title, footer, children }: { title?: string; footer?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: Spacing.two }}>
      {title ? (
        <AppText weight="bold" size={13} color={Colors.textSecondary} style={{ paddingHorizontal: Spacing.one, letterSpacing: 0.4 }}>
          {title.toUpperCase()}
        </AppText>
      ) : null}
      <View style={{ borderRadius: Radius.large, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', backgroundColor: Colors.card }}>
        {children}
      </View>
      {footer ? (
        <AppText size={12} color={Colors.textSecondary} style={{ paddingHorizontal: Spacing.one }}>
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

type RowProps = {
  label: string;
  subtitle?: string;
  icon?: IconName;
  tint?: string;
  detail?: string;
  badge?: string;
  danger?: boolean;
  last?: boolean;
  onPress?: () => void;
  right?: React.ReactNode;
};

export function Row({ label, subtitle, icon, tint = Colors.primary, detail, badge, danger, last, onPress, right }: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingHorizontal: Inset.card,
        paddingVertical: Inset.compact,
        minHeight: 56,
        backgroundColor: pressed ? Colors.tile : Colors.card,
      })}>
      {icon ? (
        <View style={{ width: ICON_SIZE, height: ICON_SIZE, borderRadius: Radius.medium, backgroundColor: `${tint}1A`, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} color={tint} size={18} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText weight="semibold" size={15} color={danger ? Colors.danger : Colors.text}>
          {label}
        </AppText>
        {subtitle ? (
          <AppText size={12} color={Colors.textSecondary}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {detail ? (
        <AppText size={13} color={Colors.textSecondary}>
          {detail}
        </AppText>
      ) : null}
      {badge ? (
        <View style={{ backgroundColor: Colors.primarySoft, borderRadius: Radius.pill, paddingHorizontal: Inset.pillH, paddingVertical: Inset.pillV }}>
          <AppText weight="bold" size={11} color={Colors.primaryDark}>
            {badge}
          </AppText>
        </View>
      ) : null}
      {right}
      {onPress && !right ? <Icon name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} color="#B5B1AB" size={13} /> : null}
      {/* Eingerueckte Trennlinie wie in den iOS-Einstellungen */}
      {last ? null : (
        <View
          style={{
            position: 'absolute',
            left: icon ? Inset.card + ICON_SIZE + Spacing.three : Inset.card,
            right: 0,
            bottom: 0,
            height: 1,
            backgroundColor: Colors.border,
          }}
        />
      )}
    </Pressable>
  );
}

export function ToggleRow({ value, onValueChange, disabled, ...props }: Omit<RowProps, 'right' | 'onPress'> & { value: boolean; onValueChange: (value: boolean) => void; disabled?: boolean }) {
  return (
    <Row
      {...props}
      right={<Switch value={value} onValueChange={onValueChange} disabled={disabled} trackColor={{ true: Colors.primary }} />}
    />
  );
}

export function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        backgroundColor: disabled ? Colors.border : pressed ? Colors.primaryDark : Colors.primary,
        borderRadius: Radius.pill,
        paddingVertical: Inset.buttonV,
        paddingHorizontal: Inset.buttonH,
        alignItems: 'center',
      })}>
      <AppText weight="bold" size={15} color="#FFFFFF">
        {label}
      </AppText>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, style }: { label: string; onPress: () => void; style?: ViewStyle }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          borderRadius: Radius.pill,
          borderWidth: 1,
          borderColor: Colors.border,
          paddingVertical: Inset.compact,
          paddingHorizontal: Inset.chipH,
          alignItems: 'center',
          backgroundColor: pressed ? Colors.tile : Colors.card,
        },
        style,
      ]}>
      <AppText weight="bold" size={14}>
        {label}
      </AppText>
    </Pressable>
  );
}
