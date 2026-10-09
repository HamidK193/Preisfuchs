import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { Group, Row } from '@/components/settings';
import { AppText, FoxLogo, Icon, type IconName } from '@/components/ui';
import { APP_VERSION } from '@/constants/app';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import { formatEuro } from '@/lib/pricing';
import { useAppState } from '@/state/app-state';

type Entry = { icon: IconName; tint: string; label: string; href?: Href; detail?: string; badge?: string };

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.tile, borderRadius: Radius.medium, paddingVertical: Inset.row, paddingHorizontal: Inset.compact, gap: 2 }}>
      <AppText weight="extrabold" size={20}>
        {value}
      </AppText>
      <AppText size={12} color={Colors.textSecondary}>
        {label}
      </AppText>
    </View>
  );
}

const PLUS_BENEFITS = ['Werbefrei', 'Unbegrenzte Preisalarme', 'Familie bis 6 Personen', '12 Monate Preisverlauf'];

export default function ProfileScreen() {
  const { favorites, location, activeStoreIds, alarms, stores, trips, lists, unreadCount } = useAppState();
  const month = new Date().toISOString().slice(0, 7);
  const monthSaving = trips.filter((trip) => trip.finishedAt.startsWith(month)).reduce((sum, trip) => sum + trip.estimatedSaving, 0);

  const sections: { title: string; rows: Entry[] }[] = [
    {
      title: 'Einkaufen',
      rows: [
        { icon: { ios: 'location.fill', android: 'location_on', web: 'location_on' }, tint: '#E8692B', label: 'Standort & Radius', href: '/einstellungen/standort', detail: `${location.plz} · ${location.radiusKm} km` },
        { icon: { ios: 'storefront.fill', android: 'storefront', web: 'storefront' }, tint: '#1F7A4D', label: 'Meine Märkte', href: '/einstellungen/maerkte', detail: `${activeStoreIds.length} aktiv` },
        { icon: { ios: 'list.bullet', android: 'list', web: 'list' }, tint: '#C2362B', label: 'Meine Listen', href: '/listen', detail: String(lists.length) },
        { icon: { ios: 'person.3.fill', android: 'groups', web: 'groups' }, tint: '#3B6FD8', label: 'Familie & Gruppen', href: '/konto', badge: 'Bald' },
      ],
    },
    {
      title: 'App',
      rows: [
        { icon: { ios: 'tray.fill', android: 'inbox', web: 'inbox' }, tint: '#E8692B', label: 'Benachrichtigungen', href: '/benachrichtigungen', badge: unreadCount > 0 ? String(unreadCount) : undefined },
        { icon: { ios: 'bell.fill', android: 'notifications', web: 'notifications' }, tint: '#D9443B', label: 'Mitteilungen', href: '/einstellungen/mitteilungen' },
        { icon: { ios: 'hand.raised.fill', android: 'privacy_tip', web: 'privacy_tip' }, tint: '#6B5BD2', label: 'Datenschutz & Werbung', href: '/einstellungen/datenschutz' },
      ],
    },
    {
      title: 'Über Preisfuchs',
      rows: [
        { icon: { ios: 'chart.bar.doc.horizontal.fill', android: 'insights', web: 'insights' }, tint: '#1F4D3A', label: 'Datenquellen', href: '/einstellungen/datenquellen', detail: 'Stand 02.10.' },
        { icon: { ios: 'questionmark.circle.fill', android: 'help', web: 'help' }, tint: '#0E8AA8', label: 'Hilfe & Feedback', href: '/einstellungen/hilfe' },
        { icon: { ios: 'doc.text.fill', android: 'description', web: 'description' }, tint: '#6E6A64', label: 'Rechtliches', href: '/einstellungen/rechtliches' },
      ],
    },
  ];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: Colors.background }}
      contentContainerStyle={{ padding: Spacing.four, gap: Spacing.five, paddingBottom: Spacing.six }}>
      <AppText weight="extrabold" size={30}>
        Profil
      </AppText>

      {/* Kopfkarte */}
      <View style={{ backgroundColor: Colors.card, borderRadius: Radius.large, borderWidth: 1, borderColor: Colors.border, padding: Inset.card, gap: Spacing.four }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.four }}>
          <FoxLogo size={60} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText weight="extrabold" size={20}>
              Hallo, Sparfuchs!
            </AppText>
            <AppText size={13} color={Colors.textSecondary}>
              Du nutzt Preisfuchs ohne Konto.
            </AppText>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <Stat value={String(favorites.length)} label="Favoriten" />
          <Stat value={String(alarms.length)} label="Preisalarme" />
          <Stat value={`ca. ${formatEuro(monthSaving)}`} label="gespart im Monat (geschätzt)" />
        </View>
        <View style={{ gap: Spacing.two }}>
          <Pressable
            onPress={() => router.push('/konto')}
            style={({ pressed }) => ({
              borderRadius: Radius.medium,
              borderWidth: 1,
              borderColor: Colors.border,
              paddingVertical: Inset.compact,
              alignItems: 'center',
              backgroundColor: pressed ? Colors.tile : Colors.card,
            })}>
            <AppText weight="bold" size={14}>
              Konto anlegen (optional)
            </AppText>
          </Pressable>
          <AppText size={12} color={Colors.textSecondary} style={{ textAlign: 'center' }}>
            Nur nötig, um Warenkörbe mit Familie oder Freunden zu teilen.
          </AppText>
        </View>
      </View>

      {/* Plus */}
      <Pressable onPress={() => router.push('/plus')} style={({ pressed }) => ({ backgroundColor: pressed ? Colors.primaryDark : Colors.primary, borderRadius: Radius.large, padding: Inset.banner, gap: Spacing.three })}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ backgroundColor: '#FFFFFF33', borderRadius: Radius.pill, paddingHorizontal: Inset.pillH, paddingVertical: Inset.pillV }}>
            <AppText weight="bold" size={11} color="#FFFFFF">
              PREISFUCHS PLUS · BALD
            </AppText>
          </View>
          <Icon name={{ ios: 'crown.fill', android: 'workspace_premium', web: 'workspace_premium' }} color="#FFE1E2" size={26} />
        </View>
        <AppText weight="extrabold" size={22} color="#FFFFFF">
          Mehr sparen mit Plus
        </AppText>
        <View style={{ gap: Spacing.two }}>
          {PLUS_BENEFITS.map((benefit) => (
            <View key={benefit} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
              <Icon name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }} color="#FFFFFF" size={18} />
              <AppText weight="semibold" size={14} color="#FFFFFF">
                {benefit}
              </AppText>
            </View>
          ))}
        </View>
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: Radius.medium, paddingVertical: Inset.buttonV, alignItems: 'center', marginTop: Spacing.one }}>
          <AppText weight="bold" size={15} color={Colors.primaryDark}>
            Mehr erfahren
          </AppText>
        </View>
      </Pressable>

      {/* Einstellungen */}
      {sections.map((section) => (
        <Group key={section.title} title={section.title}>
          {section.rows.map((row, index) => (
            <Row
              key={row.label}
              icon={row.icon}
              tint={row.tint}
              label={row.label}
              detail={row.detail}
              badge={row.badge}
              onPress={row.href ? () => router.push(row.href as Href) : undefined}
              last={index === section.rows.length - 1}
            />
          ))}
        </Group>
      ))}

      <View style={{ alignItems: 'center', gap: 4 }}>
        <AppText size={12} color={Colors.textSecondary}>
          Preisfuchs {APP_VERSION} · {stores.length} Märkte · Demo-Preise
        </AppText>
        <AppText size={12} color={Colors.textSecondary}>
          Die Preis-Rangliste ist nicht käuflich.
        </AppText>
      </View>
    </ScrollView>
  );
}
