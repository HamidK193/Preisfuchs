import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Page, SecondaryButton } from '@/components/settings';
import { EmptyState } from '@/components/system-states';
import { AppText, Icon } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import type { InboxItem } from '@/lib/inbox';
import { formatDate } from '@/lib/pricing';
import { useAppState } from '@/state/app-state';

function open(item: InboxItem) {
  if (item.kind === 'alarm' && item.productId) {
    router.push({ pathname: '/produkt/[id]', params: { id: item.productId } });
  } else {
    router.push('/angebote');
  }
}

// Benachrichtigungen: ausgeloeste Preisalarme und Wochenangebote, gelesen/ungelesen.
export default function InboxScreen() {
  const { inbox, unreadCount, markInboxRead, dismissInboxItem } = useAppState();

  return (
    <Page contentStyle={{ gap: Spacing.three }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText size={13} color={Colors.textSecondary}>
          {unreadCount > 0 ? `${unreadCount} ungelesen` : 'Alles gelesen'}
        </AppText>
        {unreadCount > 0 ? (
          <Pressable onPress={() => markInboxRead(inbox.map((item) => item.id))} hitSlop={8}>
            <AppText weight="bold" size={13} color={Colors.primary}>
              Alle als gelesen markieren
            </AppText>
          </Pressable>
        ) : null}
      </View>

      {inbox.length === 0 ? (
        <EmptyState
          title="Keine Benachrichtigungen"
          text="Hier erscheinen erreichte Wunschpreise deiner Preisalarme und neue Angebote in deinen Märkten.">
          <SecondaryButton label="Mitteilungen einstellen" onPress={() => router.push('/einstellungen/mitteilungen')} />
        </EmptyState>
      ) : null}

      {inbox.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => {
            markInboxRead([item.id]);
            open(item);
          }}
          onLongPress={() => dismissInboxItem(item.id)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            gap: Spacing.three,
            padding: Inset.row,
            borderRadius: Radius.large,
            borderWidth: 1,
            borderColor: item.read ? Colors.border : Colors.primarySoft,
            backgroundColor: pressed ? Colors.tile : item.read ? Colors.card : '#FFF7F7',
          })}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: Radius.medium,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: item.kind === 'alarm' ? Colors.greenSoft : Colors.primarySoft,
            }}>
            <Icon
              name={
                item.kind === 'alarm'
                  ? { ios: 'bell.badge.fill', android: 'notifications_active', web: 'notifications_active' }
                  : { ios: 'tag.fill', android: 'sell', web: 'sell' }
              }
              size={17}
              color={item.kind === 'alarm' ? Colors.green : Colors.primary}
            />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
              <AppText weight={item.read ? 'semibold' : 'extrabold'} size={15} style={{ flex: 1 }} numberOfLines={2}>
                {item.title}
              </AppText>
              {item.read ? null : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary }} />}
            </View>
            <AppText size={13} color={Colors.textSecondary}>
              {item.text}
            </AppText>
            <AppText size={11} color={Colors.textSecondary}>
              Stand: {formatDate(item.date)}
            </AppText>
          </View>
        </Pressable>
      ))}

      {inbox.length > 0 ? (
        <AppText size={11} color={Colors.textSecondary}>
          Lange drücken entfernt einen Eintrag. Mitteilungen aufs Handy (Push) folgen in einer späteren Version.
        </AppText>
      ) : null}
    </Page>
  );
}
