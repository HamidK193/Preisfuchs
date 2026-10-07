import { Pressable, View } from 'react-native';

import { Group, Page, ToggleRow } from '@/components/settings';
import { AppText } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import { useAppState, type NotificationSettings } from '@/state/app-state';

const WEEKDAYS: NotificationSettings['weekday'][] = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

export default function NotificationsScreen() {
  const { notifications, updateNotifications } = useAppState();

  return (
    <Page>
      <AppText size={14} color={Colors.textSecondary}>
        Lege fest, worüber Preisfuchs dich benachrichtigen soll. Mitteilungen werden in einer späteren Version
        verschickt – deine Auswahl wird schon gespeichert.
      </AppText>

      <Group title="Preise">
        <ToggleRow
          icon={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
          tint="#D9443B"
          label="Preisalarme"
          subtitle="Wenn ein Wunschpreis erreicht ist"
          value={notifications.priceAlerts}
          onValueChange={(value) => updateNotifications({ priceAlerts: value })}
        />
        <ToggleRow
          icon={{ ios: 'basket.fill', android: 'shopping_basket', web: 'shopping_basket' }}
          tint="#1F7A4D"
          label="Preisänderungen im Warenkorb"
          subtitle="Wenn Artikel in deinem Warenkorb günstiger werden"
          value={notifications.cartChanges}
          onValueChange={(value) => updateNotifications({ cartChanges: value })}
          last
        />
      </Group>

      <Group title="Angebote">
        <ToggleRow
          icon={{ ios: 'newspaper.fill', android: 'newspaper', web: 'newspaper' }}
          tint="#3B6FD8"
          label="Neue Wochenangebote"
          subtitle="Einmal pro Woche, wenn neue Prospekte da sind"
          value={notifications.weeklyOffers}
          onValueChange={(value) => updateNotifications({ weeklyOffers: value })}
          last={!notifications.weeklyOffers}
        />
        {notifications.weeklyOffers ? (
          <View style={{ padding: Inset.card, gap: Spacing.three }}>
            <AppText weight="semibold" size={14}>
              Wochentag
            </AppText>
            <View style={{ flexDirection: 'row', gap: Spacing.two }}>
              {WEEKDAYS.map((day) => {
                const selected = notifications.weekday === day;
                return (
                  <Pressable
                    key={day}
                    onPress={() => updateNotifications({ weekday: day })}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      paddingVertical: Inset.chipV,
                      borderRadius: Radius.pill,
                      borderWidth: 1,
                      borderColor: selected ? Colors.text : Colors.border,
                      backgroundColor: selected ? Colors.text : Colors.card,
                    }}>
                    <AppText weight="bold" size={13} color={selected ? '#FFFFFF' : Colors.text}>
                      {day}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </Group>

      <Group title="Ruhezeiten" footer="Zwischen 22:00 und 07:00 Uhr bleibt dein Handy still.">
        <ToggleRow
          icon={{ ios: 'moon.fill', android: 'bedtime', web: 'bedtime' }}
          tint="#6B5BD2"
          label="Nachtruhe"
          subtitle="22:00 – 07:00 Uhr"
          value={notifications.quietHours}
          onValueChange={(value) => updateNotifications({ quietHours: value })}
          last
        />
      </Group>

      <AppText size={12} color={Colors.textSecondary} style={{ textAlign: 'center' }}>
        Wir senden keine Werbung per Mitteilung.
      </AppText>
    </Page>
  );
}
