import { useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocationSetup } from '@/components/location-setup';
import { Group, PrimaryButton, SecondaryButton, ToggleRow } from '@/components/settings';
import { AppText, FoxLogo, Icon, StoreBadge, type IconName } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import { useAppState } from '@/state/app-state';

type Step = 'intro' | 'consent' | 'location' | 'stores' | 'notifications';

// Schritte mit Fortschrittsanzeige (das Intro hat eigene Punkte).
const PROGRESS_STEPS: Step[] = ['consent', 'location', 'stores', 'notifications'];

const SLIDES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: { ios: 'tag.fill', android: 'sell', web: 'sell' },
    title: 'Preise vergleichen, bevor du losgehst',
    text: 'Sieh auf einen Blick, wo Butter, Milch und Co. in deiner Nähe gerade am günstigsten sind.',
  },
  {
    icon: { ios: 'cart.fill', android: 'shopping_cart', web: 'shopping_cart' },
    title: 'Warenkorb clever aufteilen',
    text: 'Preisfuchs rechnet aus, ob sich ein Markt reicht oder ob zwei Märkte zusammen günstiger sind.',
  },
  {
    icon: { ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' },
    title: 'Ehrliche Preise mit Quelle und Datum',
    text: 'Jeder Preis zeigt, woher er stammt und wann er beobachtet wurde. Im Markt kann er abweichen.',
  },
];

// Erster Start: kurzes Intro, Einwilligung, Standort, Lieblingsmaerkte, Mitteilungen.
export function Onboarding() {
  const { storesFromOsm, completeOnboarding } = useAppState();
  const [selectedStep, setStep] = useState<Step>('intro');
  // Sobald der Standort gesetzt ist, geht es mit den Maerkten weiter.
  const step: Step = selectedStep === 'location' && storesFromOsm ? 'stores' : selectedStep;

  if (step === 'intro') {
    return <Intro onDone={() => setStep('consent')} />;
  }
  if (step === 'location') {
    return <LocationSetup />;
  }

  const progress = PROGRESS_STEPS.indexOf(step);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ flexDirection: 'row', gap: Spacing.one, paddingHorizontal: Spacing.five, paddingTop: Spacing.three }}>
        {PROGRESS_STEPS.map((item, index) => (
          <View key={item} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: index <= progress ? Colors.primary : Colors.border }} />
        ))}
      </View>
      {step === 'consent' ? <ConsentStep onDone={() => setStep(storesFromOsm ? 'stores' : 'location')} /> : null}
      {step === 'stores' ? <StoresStep onDone={() => setStep('notifications')} /> : null}
      {step === 'notifications' ? <NotificationsStep onDone={completeOnboarding} /> : null}
    </SafeAreaView>
  );
}

function Intro({ onDone }: { onDone: () => void }) {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const [scroller, setScroller] = useState<ScrollView | null>(null);
  const last = page === SLIDES.length - 1;

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  const next = () => {
    if (last) {
      onDone();
      return;
    }
    scroller?.scrollTo({ x: (page + 1) * width, animated: true });
    setPage(page + 1);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: Spacing.five, paddingTop: Spacing.two }}>
        <Pressable onPress={onDone} hitSlop={10}>
          <AppText weight="semibold" size={15} color={Colors.textSecondary}>
            Überspringen
          </AppText>
        </Pressable>
      </View>

      <ScrollView ref={setScroller} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll} style={{ flex: 1 }}>
        {SLIDES.map((slide, index) => (
          <View key={slide.title} style={{ width, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.six, gap: Spacing.five }}>
            {index === 0 ? (
              <FoxLogo size={160} />
            ) : (
              <View style={{ width: 160, height: 160, borderRadius: 80, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={slide.icon} size={72} color={Colors.primary} />
              </View>
            )}
            <AppText weight="extrabold" size={28} style={{ textAlign: 'center', lineHeight: 34 }}>
              {slide.title}
            </AppText>
            <AppText size={16} color={Colors.textSecondary} style={{ textAlign: 'center', lineHeight: 22 }}>
              {slide.text}
            </AppText>
          </View>
        ))}
      </ScrollView>

      <View style={{ padding: Spacing.five, gap: Spacing.five }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: Spacing.two }}>
          {SLIDES.map((slide, index) => (
            <View
              key={slide.title}
              style={{ width: index === page ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: index === page ? Colors.primary : Colors.border }}
            />
          ))}
        </View>
        <PrimaryButton label={last ? "Los geht's" : 'Weiter'} onPress={next} />
      </View>
    </SafeAreaView>
  );
}

function StepHeader({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <View style={{ alignItems: 'center', gap: Spacing.three }}>
      <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={44} color={Colors.primary} />
      </View>
      <AppText weight="extrabold" size={26} style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      <AppText size={15} color={Colors.textSecondary} style={{ textAlign: 'center', lineHeight: 21 }}>
        {text}
      </AppText>
    </View>
  );
}

// Einwilligung wie in den Einstellungen: Ablehnen und Akzeptieren gleichwertig.
function ConsentStep({ onDone }: { onDone: () => void }) {
  const { consent, updateConsent } = useAppState();
  const decide = (accept: boolean) => {
    updateConsent({ personalizedAds: accept, analytics: accept });
    onDone();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: Spacing.five, gap: Spacing.five }}>
      <StepHeader
        icon={{ ios: 'hand.raised.fill', android: 'privacy_tip', web: 'privacy_tip' }}
        title="Deine Privatsphäre"
        text="Preisfuchs ist kostenlos und finanziert sich über klar gekennzeichnete Anzeigen und das optionale Abo Plus. Du entscheidest, was erlaubt ist."
      />
      <Group footer="Du kannst deine Auswahl jederzeit unter Profil › Datenschutz & Werbung ändern.">
        <ToggleRow label="Notwendige Funktionen" subtitle="Warenkorb, Favoriten und Einstellungen speichern" value disabled onValueChange={() => undefined} />
        <ToggleRow
          label="Personalisierte Anzeigen"
          subtitle="Anzeigen passend zu deinen Interessen"
          value={consent.personalizedAds}
          onValueChange={(value) => updateConsent({ personalizedAds: value })}
        />
        <ToggleRow
          label="Anonyme Nutzungsstatistik"
          subtitle="Hilft uns, Suche und Preisvergleich zu verbessern"
          value={consent.analytics}
          onValueChange={(value) => updateConsent({ analytics: value })}
          last
        />
      </Group>
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        <SecondaryButton label="Alle ablehnen" onPress={() => decide(false)} style={{ flex: 1 }} />
        <SecondaryButton label="Alle akzeptieren" onPress={() => decide(true)} style={{ flex: 1 }} />
      </View>
      <PrimaryButton label="Auswahl speichern" onPress={onDone} />
    </ScrollView>
  );
}

function StoresStep({ onDone }: { onDone: () => void }) {
  const { stores, activeStoreIds, toggleStore, location } = useAppState();

  return (
    <ScrollView contentContainerStyle={{ padding: Spacing.five, gap: Spacing.five }}>
      <StepHeader
        icon={{ ios: 'storefront.fill', android: 'storefront', web: 'storefront' }}
        title="Deine Märkte"
        text={`Diese Märkte haben wir im Umkreis von ${location.radiusKm} km gefunden. Wähle, wo du einkaufst – nur diese vergleichen wir.`}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three }}>
        {stores.map((store) => {
          const active = activeStoreIds.includes(store.id);
          return (
            <Pressable
              key={store.id}
              onPress={() => toggleStore(store.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              style={{
                width: '47%',
                flexGrow: 1,
                alignItems: 'center',
                gap: Spacing.two,
                padding: Inset.card,
                borderRadius: Radius.large,
                borderWidth: active ? 2 : 1,
                borderColor: active ? Colors.primary : Colors.border,
                backgroundColor: Colors.card,
              }}>
              <View style={{ position: 'absolute', top: Spacing.two, right: Spacing.two }}>
                <Icon
                  name={active ? { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' } : { ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' }}
                  size={22}
                  color={active ? Colors.primary : Colors.border}
                />
              </View>
              <View style={{ transform: [{ scale: 1.3 }], marginVertical: Spacing.two }}>
                <StoreBadge storeId={store.id} size="large" />
              </View>
              <AppText weight="bold" size={15}>
                {store.name}
              </AppText>
              <AppText size={12} color={Colors.textSecondary}>
                {store.distanceKm.toLocaleString('de-DE')} km entfernt
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <PrimaryButton label={`Weiter (${activeStoreIds.length} ausgewählt)`} onPress={onDone} />
    </ScrollView>
  );
}

function NotificationsStep({ onDone }: { onDone: () => void }) {
  const { notifications, updateNotifications } = useAppState();

  return (
    <ScrollView contentContainerStyle={{ padding: Spacing.five, gap: Spacing.five }}>
      <StepHeader
        icon={{ ios: 'bell.badge.fill', android: 'notifications_active', web: 'notifications_active' }}
        title="Keine Sparchance verpassen"
        text="Worüber sollen wir dich informieren? Mitteilungen werden in einer späteren Version verschickt – deine Auswahl wird schon gespeichert."
      />
      <Group>
        <ToggleRow
          icon={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
          tint="#D9443B"
          label="Preisalarme"
          subtitle="Wenn ein Wunschpreis erreicht ist"
          value={notifications.priceAlerts}
          onValueChange={(value) => updateNotifications({ priceAlerts: value })}
        />
        <ToggleRow
          icon={{ ios: 'newspaper.fill', android: 'newspaper', web: 'newspaper' }}
          tint="#3B6FD8"
          label="Neue Wochenangebote"
          subtitle="Einmal pro Woche"
          value={notifications.weeklyOffers}
          onValueChange={(value) => updateNotifications({ weeklyOffers: value })}
          last
        />
      </Group>
      <AppText size={13} color={Colors.textSecondary} style={{ textAlign: 'center' }}>
        Keine Werbung per Mitteilung. Kein Konto nötig – alles bleibt auf deinem Gerät.
      </AppText>
      <PrimaryButton label="Fertig" onPress={onDone} />
    </ScrollView>
  );
}
