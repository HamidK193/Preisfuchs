import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { AppText, Icon, type IconName } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';

type Plan = 'jahr' | 'monat';

const BENEFITS: { label: string; text: string; icon: IconName; tint: string }[] = [
  { label: 'Werbefrei', text: 'Keine Anzeigen in der App', icon: { ios: 'nosign', android: 'block', web: 'block' }, tint: '#E8692B' },
  { label: 'Unbegrenzte Alarme', text: 'Statt 3 kostenlosen', icon: { ios: 'bell.fill', android: 'notifications', web: 'notifications' }, tint: '#D9443B' },
  { label: 'Familie bis 6', text: 'Geteilte Warenkörbe', icon: { ios: 'person.3.fill', android: 'groups', web: 'groups' }, tint: '#3B6FD8' },
  { label: '12 Monate Verlauf', text: 'Statt 8 Wochen', icon: { ios: 'chart.xyaxis.line', android: 'show_chart', web: 'show_chart' }, tint: '#1F7A4D' },
];

const COMPARISON: [string, string, string][] = [
  ['Preisvergleich & Warenkorb', '✓', '✓'],
  ['Preisalarme', '3', 'unbegrenzt'],
  ['Preisverlauf', '8 Wochen', '12 Monate'],
  ['Aufteilen auf Märkte', '2', '3'],
  ['Familie & Gruppen', '–', 'bis 6 Personen'],
  ['Werbefrei', '–', '✓'],
];

export default function PlusScreen() {
  const [plan, setPlan] = useState<Plan>('jahr');

  const planCard = (id: Plan, title: string, price: string, note?: string) => {
    const selected = plan === id;
    return (
      <Pressable
        onPress={() => setPlan(id)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.three,
          padding: Inset.card,
          borderRadius: Radius.large,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? Colors.primary : Colors.border,
          backgroundColor: selected ? Colors.primarySoft : Colors.card,
        }}>
        <Icon
          name={selected ? { ios: 'largecircle.fill.circle', android: 'radio_button_checked', web: 'radio_button_checked' } : { ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' }}
          size={22}
          color={selected ? Colors.primary : Colors.textSecondary}
        />
        <View style={{ flex: 1 }}>
          <AppText weight="bold" size={16}>
            {title}
          </AppText>
          {note ? (
            <AppText size={12} color={Colors.greenText} weight="semibold">
              {note}
            </AppText>
          ) : null}
        </View>
        <AppText weight="extrabold" size={17}>
          {price}
        </AppText>
      </Pressable>
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={{ padding: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.five }}>
      <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Schließen" style={{ alignSelf: 'flex-end', marginTop: Spacing.two }}>
        <Icon name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }} size={28} color={Colors.textSecondary} />
      </Pressable>

      <View style={{ alignItems: 'center', gap: Spacing.two, marginTop: -Spacing.three }}>
        <AppText size={64}>🦊</AppText>
        <View style={{ backgroundColor: Colors.primary, borderRadius: Radius.pill, paddingHorizontal: Inset.pillH, paddingVertical: Inset.pillV }}>
          <AppText weight="bold" size={11} color="#FFFFFF">
            BALD VERFÜGBAR
          </AppText>
        </View>
        <AppText weight="extrabold" size={30}>
          Preisfuchs Plus
        </AppText>
        <AppText size={15} color={Colors.textSecondary} style={{ textAlign: 'center' }}>
          Mehr sparen, ohne Werbung – für dich und deine Familie.
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
        {BENEFITS.map((benefit) => (
          <View key={benefit.label} style={{ width: '48.5%', backgroundColor: `${benefit.tint}14`, borderRadius: Radius.large, padding: Inset.card, gap: Spacing.two }}>
            <Icon name={benefit.icon} size={22} color={benefit.tint} />
            <AppText weight="bold" size={15}>
              {benefit.label}
            </AppText>
            <AppText size={12} color={Colors.textSecondary}>
              {benefit.text}
            </AppText>
          </View>
        ))}
      </View>

      <View style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.large, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', padding: Inset.compact, backgroundColor: Colors.tile }}>
          <AppText weight="bold" size={12} color={Colors.textSecondary} style={{ flex: 2 }}>
            FUNKTION
          </AppText>
          <AppText weight="bold" size={12} color={Colors.textSecondary} style={{ flex: 1, textAlign: 'center' }}>
            KOSTENLOS
          </AppText>
          <AppText weight="bold" size={12} color={Colors.primary} style={{ flex: 1, textAlign: 'center' }}>
            PLUS
          </AppText>
        </View>
        {COMPARISON.map(([feature, free, plus]) => (
          <View key={feature} style={{ flexDirection: 'row', padding: Inset.compact, borderTopWidth: 1, borderTopColor: Colors.border }}>
            <AppText size={13} style={{ flex: 2 }}>
              {feature}
            </AppText>
            <AppText size={13} color={Colors.textSecondary} style={{ flex: 1, textAlign: 'center' }}>
              {free}
            </AppText>
            <AppText weight="bold" size={13} style={{ flex: 1, textAlign: 'center' }}>
              {plus}
            </AppText>
          </View>
        ))}
      </View>

      <View style={{ gap: Spacing.two }}>
        {planCard('jahr', 'Jährlich', '14,99 €', '1,25 € pro Monat · 37 % sparen')}
        {planCard('monat', 'Monatlich', '1,99 €')}
      </View>

      <Pressable
        onPress={() => Alert.alert('Bald verfügbar', 'Preisfuchs Plus startet mit einer der nächsten Versionen. Bis dahin ist alles kostenlos.')}
        style={({ pressed }) => ({ backgroundColor: pressed ? Colors.primaryDark : Colors.primary, borderRadius: Radius.pill, paddingVertical: Inset.buttonV, alignItems: 'center' })}>
        <AppText weight="bold" size={16} color="#FFFFFF">
          14 Tage kostenlos testen
        </AppText>
      </Pressable>
      <AppText size={12} color={Colors.textSecondary} style={{ textAlign: 'center', marginTop: -Spacing.three }}>
        Danach {plan === 'jahr' ? '14,99 € pro Jahr' : '1,99 € pro Monat'}, jederzeit kündbar.
      </AppText>
    </ScrollView>
  );
}
