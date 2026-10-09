import { router, useLocalSearchParams } from 'expo-router';
import { Share, View } from 'react-native';

import { PrimaryButton, SecondaryButton } from '@/components/settings';
import { SheetScroll } from '@/components/sheet';
import { AppText, Card, Icon } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { products } from '@/data/products';
import { shareLink, shareText } from '@/lib/share-list';
import { useAppState } from '@/state/app-state';

// Liste teilen: als Text oder als Link, den Preisfuchs als neue Liste uebernimmt.
export default function ShareListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lists } = useAppState();
  const list = lists.find((item) => item.id === id);

  if (!list) {
    return (
      <SheetScroll contentContainerStyle={{ padding: Spacing.four }}>
        <AppText>Diese Liste gibt es nicht mehr.</AppText>
      </SheetScroll>
    );
  }

  const text = shareText(list, products);
  const empty = list.lines.length === 0;

  return (
    <SheetScroll contentContainerStyle={{ padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.six }}>
      <AppText weight="extrabold" size={22}>
        {list.emoji} {list.name} teilen
      </AppText>

      <Card style={{ gap: Spacing.one }}>
        <AppText size={14} style={{ lineHeight: 21 }}>
          {empty ? 'Die Liste ist noch leer.' : text}
        </AppText>
      </Card>

      <PrimaryButton
        label="Link zum Übernehmen teilen"
        disabled={empty}
        onPress={() => Share.share({ message: `${text}\n\nIn Preisfuchs öffnen: ${shareLink(list)}` })}
      />
      <SecondaryButton label="Nur als Text teilen" onPress={() => Share.share({ message: text })} />

      <AppText size={12} color={Colors.textSecondary}>
        Wer den Link in Preisfuchs öffnet, bekommt eine eigene Kopie der Liste. Änderungen werden nicht abgeglichen.
      </AppText>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, backgroundColor: Colors.tile, borderColor: Colors.tile }}>
        <Icon name={{ ios: 'person.2.fill', android: 'group', web: 'group' }} size={22} color={Colors.textSecondary} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText weight="bold" size={14}>
            Gemeinsam bearbeiten
          </AppText>
          <AppText size={12} color={Colors.textSecondary}>
            Mit „Familie & Gruppen“ sehen alle Mitglieder Änderungen sofort (Anmeldung per E-Mail).
          </AppText>
        </View>
        <AppText weight="bold" size={13} color={Colors.primary} onPress={() => router.push('/familie')}>
          Mehr
        </AppText>
      </Card>
    </SheetScroll>
  );
}
