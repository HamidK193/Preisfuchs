import { useState } from 'react';
import { Linking, Pressable, TextInput, View } from 'react-native';

import { Group, Page, PrimaryButton, Row } from '@/components/settings';
import { AppText, Icon } from '@/components/ui';
import { CONTACT_EMAIL } from '@/constants/app';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';

const FAQ = [
  {
    question: 'Woher kommen die Preise?',
    answer:
      'Aus Händler-Prospekten, der offenen Datenbank Open Prices und Meldungen der Community. Jeder Preis zeigt seine Quelle und das Datum. In dieser Testversion sind alle Preise Demo-Daten.',
  },
  {
    question: 'Warum fehlt mein Markt?',
    answer:
      'Für manche Ketten liegen noch keine Preise vor. Unter Profil → Meine Märkte siehst du, welche Märkte im Vergleich sind. Weitere Ketten kommen mit neuen Datenquellen dazu.',
  },
  {
    question: 'Wie funktioniert der Marktvergleich?',
    answer:
      'Preisfuchs addiert die beobachteten Preise deines Warenkorbs pro Markt. Fehlende Artikel werden nicht eingerechnet, sondern angezeigt. Auf Wunsch rechnet Preisfuchs aus, ob sich zwei Märkte lohnen.',
  },
  {
    question: 'Was kostet Preisfuchs Plus?',
    answer:
      'Preisfuchs bleibt kostenlos. Plus kostet 14,99 € im Jahr oder 1,99 € im Monat und bringt werbefreie Nutzung, unbegrenzte Preisalarme und Familien-Warenkörbe. Plus ist bald verfügbar.',
  },
  {
    question: 'Wie lösche ich meine Daten?',
    answer: 'Unter Profil → Datenschutz & Werbung → Alle Daten löschen. Ohne Konto liegen deine Daten nur auf diesem Gerät.',
  },
];

export default function HelpScreen() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | undefined>(FAQ[0].question);
  const [stars, setStars] = useState(0);
  const [feedback, setFeedback] = useState('');

  const needle = query.trim().toLowerCase();
  const visible = FAQ.filter((item) => !needle || `${item.question} ${item.answer}`.toLowerCase().includes(needle));

  const sendFeedback = () => {
    const body = `Bewertung: ${stars} von 5\n\n${feedback}`;
    Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Feedback zu Preisfuchs')}&body=${encodeURIComponent(body)}`);
  };

  return (
    <Page>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.medium, paddingHorizontal: Inset.card, height: 48 }}>
        <Icon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={16} color={Colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Frage suchen"
          placeholderTextColor={Colors.textSecondary}
          style={{ flex: 1, fontSize: 16, color: Colors.text }}
        />
      </View>

      <Group title="Häufige Fragen">
        {visible.length === 0 ? (
          <View style={{ padding: Inset.card }}>
            <AppText size={14} color={Colors.textSecondary}>
              Keine passende Frage gefunden. Schreib uns gerne.
            </AppText>
          </View>
        ) : null}
        {visible.map((item, index) => {
          const expanded = open === item.question;
          return (
            <Pressable
              key={item.question}
              onPress={() => setOpen(expanded ? undefined : item.question)}
              style={{ padding: Inset.card, gap: Spacing.two, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: Colors.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
                <AppText weight="semibold" size={15} style={{ flex: 1 }}>
                  {item.question}
                </AppText>
                <Icon
                  name={expanded ? { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' } : { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
                  size={13}
                  color={Colors.textSecondary}
                />
              </View>
              {expanded ? (
                <AppText size={14} color={Colors.textSecondary}>
                  {item.answer}
                </AppText>
              ) : null}
            </Pressable>
          );
        })}
      </Group>

      <Group title="Feedback geben">
        <View style={{ padding: Inset.card, gap: Spacing.three }}>
          <AppText weight="semibold" size={15}>
            Wie zufrieden bist du mit Preisfuchs?
          </AppText>
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable key={value} onPress={() => setStars(value)} hitSlop={6} accessibilityLabel={`${value} Sterne`}>
                <Icon
                  name={value <= stars ? { ios: 'star.fill', android: 'star', web: 'star' } : { ios: 'star', android: 'star_border', web: 'star_border' }}
                  size={28}
                  color={Colors.primary}
                />
              </Pressable>
            ))}
          </View>
          <TextInput
            value={feedback}
            onChangeText={setFeedback}
            placeholder="Was können wir verbessern? Welcher Markt fehlt dir?"
            placeholderTextColor={Colors.textSecondary}
            multiline
            style={{ minHeight: 96, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.medium, padding: Inset.compact, fontSize: 15, color: Colors.text, textAlignVertical: 'top' }}
          />
          <PrimaryButton label="Feedback senden" disabled={stars === 0 && !feedback.trim()} onPress={sendFeedback} />
        </View>
      </Group>

      <Group>
        <Row
          icon={{ ios: 'envelope.fill', android: 'mail', web: 'mail' }}
          tint="#0E8AA8"
          label="Kontakt"
          subtitle={CONTACT_EMAIL}
          onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
          last
        />
      </Group>
    </Page>
  );
}
