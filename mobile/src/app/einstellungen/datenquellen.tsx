import { Linking, Pressable, View } from 'react-native';

import { Page } from '@/components/settings';
import { AppText, Icon, Pill, type IconName } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import { formatDate } from '@/lib/pricing';
import { DEMO_DATA_DATE } from '@/data/products';

type Source = { name: string; provides: string; license: string; icon: IconName; tint: string; url?: string };

const SOURCES: Source[] = [
  {
    name: 'Händler-Prospekte',
    provides: 'Wochenangebote der Supermärkte und Discounter.',
    license: 'Quelle je Angebot',
    icon: { ios: 'newspaper.fill', android: 'newspaper', web: 'newspaper' },
    tint: '#E8692B',
  },
  {
    name: 'Open Prices',
    provides: 'Offene Preisdatenbank mit Preisen, die Nutzer in Märkten erfasst haben.',
    license: 'ODbL',
    icon: { ios: 'tag.fill', android: 'sell', web: 'sell' },
    tint: '#3B6FD8',
    url: 'https://prices.openfoodfacts.org',
  },
  {
    name: 'Open Food Facts',
    provides: 'Produktdaten wie Zutaten, Nährwerte, Nutri-Score und Bilder.',
    license: 'ODbL',
    icon: { ios: 'barcode', android: 'barcode', web: 'barcode' },
    tint: '#1F7A4D',
    url: 'https://world.openfoodfacts.org',
  },
  {
    name: 'OpenStreetMap',
    provides: 'Standorte und Öffnungszeiten der Märkte.',
    license: 'ODbL',
    icon: { ios: 'map.fill', android: 'map', web: 'map' },
    tint: '#0E8AA8',
    url: 'https://www.openstreetmap.org/copyright',
  },
  {
    name: 'Community-Meldungen',
    provides: 'Hinweise auf falsche oder neue Preise aus der Preisfuchs-Community.',
    license: 'freiwillig',
    icon: { ios: 'person.2.fill', android: 'group', web: 'group' },
    tint: '#6B5BD2',
  },
];

export default function SourcesScreen() {
  return (
    <Page>
      <View style={{ backgroundColor: Colors.greenSoft, borderRadius: Radius.large, padding: Inset.card, gap: Spacing.two }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
          <Icon name={{ ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' }} size={20} color={Colors.green} />
          <AppText weight="extrabold" size={16} color={Colors.green}>
            Die Preis-Rangliste ist nicht käuflich.
          </AppText>
        </View>
        <AppText size={13} color={Colors.green}>
          Der günstigste Preis steht oben. Anzeigen und gesponserte Inhalte sind immer gekennzeichnet und ändern die
          Reihenfolge nie.
        </AppText>
      </View>

      <View style={{ gap: Spacing.three }}>
        {SOURCES.map((source) => (
          <Pressable
            key={source.name}
            disabled={!source.url}
            onPress={() => source.url && Linking.openURL(source.url)}
            style={({ pressed }) => ({
              borderWidth: 1,
              borderColor: Colors.border,
              borderRadius: Radius.large,
              padding: Inset.card,
              gap: Spacing.two,
              backgroundColor: pressed ? Colors.tile : Colors.card,
            })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
              <View style={{ width: 36, height: 36, borderRadius: Radius.medium, backgroundColor: `${source.tint}1A`, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={source.icon} size={18} color={source.tint} />
              </View>
              <AppText weight="bold" size={16} style={{ flex: 1 }}>
                {source.name}
              </AppText>
              <Pill tone="gray" label={source.license} />
            </View>
            <AppText size={14} color={Colors.textSecondary}>
              {source.provides}
            </AppText>
          </Pressable>
        ))}
      </View>

      <View style={{ backgroundColor: Colors.primarySoft, borderRadius: Radius.large, padding: Inset.card, gap: 4 }}>
        <AppText weight="bold" size={14} color={Colors.primaryDark}>
          Wichtiger Hinweis zu Preisen
        </AppText>
        <AppText size={13} color={Colors.primaryDark}>
          Preise sind Beobachtungen, keine garantierten Marktpreise. Im Markt kann der Preis abweichen. Diese
          Testversion zeigt Demo-Daten mit Stand {formatDate(DEMO_DATA_DATE)}.
        </AppText>
      </View>
    </Page>
  );
}
