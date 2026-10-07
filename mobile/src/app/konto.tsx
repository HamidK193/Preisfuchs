import { router } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';

import { SheetScroll } from '@/components/sheet';
import { AppText, FoxLogo, Icon, type IconName } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';

function LoginButton({ label, icon, dark, iconColor }: { label: string; icon: IconName; dark?: boolean; iconColor?: string }) {
  return (
    <Pressable
      onPress={() => Alert.alert('Bald verfügbar', 'Konten zum Teilen und Synchronisieren kommen in einer der nächsten Versionen.')}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.two,
        height: 52,
        borderRadius: Radius.medium,
        borderWidth: dark ? 0 : 1,
        borderColor: Colors.border,
        backgroundColor: dark ? '#000000' : pressed ? Colors.tile : Colors.card,
        opacity: pressed && dark ? 0.85 : 1,
      })}>
      <Icon name={icon} size={18} color={iconColor ?? (dark ? '#FFFFFF' : Colors.text)} />
      <AppText weight="bold" size={16} color={dark ? '#FFFFFF' : Colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

export default function AccountSheet() {
  return (
    <SheetScroll contentContainerStyle={{ padding: Spacing.five, paddingTop: Spacing.six, gap: Spacing.four }}>
      <View style={{ alignItems: 'center', gap: Spacing.three }}>
        <FoxLogo size={88} />
        <AppText weight="extrabold" size={24}>
          Gemeinsam einkaufen
        </AppText>
        <AppText size={15} color={Colors.textSecondary} style={{ textAlign: 'center' }}>
          Ein Konto brauchst du nur, um Warenkörbe mit Familie oder Freunden zu teilen und zu synchronisieren.
        </AppText>
      </View>

      <View style={{ gap: Spacing.three, marginTop: Spacing.two }}>
        <LoginButton label="Mit Apple anmelden" icon={{ ios: 'apple.logo', android: 'phone_iphone', web: 'phone_iphone' }} dark />
        <LoginButton label="Mit Google anmelden" icon={{ ios: 'g.circle.fill', android: 'account_circle', web: 'account_circle' }} iconColor="#4285F4" />
        <LoginButton label="Mit E-Mail fortfahren" icon={{ ios: 'envelope', android: 'mail', web: 'mail' }} />
      </View>

      <AppText size={12} color={Colors.textSecondary} style={{ textAlign: 'center' }}>
        Mit der Anmeldung akzeptierst du die Nutzungsbedingungen und die Datenschutzerklärung.
      </AppText>

      <Pressable onPress={() => router.back()} style={{ alignItems: 'center', paddingVertical: Inset.compact }}>
        <AppText weight="bold" size={15} color={Colors.textSecondary}>
          Später
        </AppText>
      </Pressable>
    </SheetScroll>
  );
}
