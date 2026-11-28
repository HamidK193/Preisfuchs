import { useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocationSetup } from '@/components/location-setup';
import { PrimaryButton, SecondaryButton } from '@/components/settings';
import { AppText, FoxLogo, Icon, StoreBadge, type IconName } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import { useAppState } from '@/state/app-state';

type Step = 'intro' | 'location' | 'stores';

const PROGRESS_STEPS: Step[] = ['location', 'stores'];

const SLIDES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: { ios: 'tag.fill', android: 'sell', web: 'sell' },
    title: 'Preise vergleichen, bevor du losgehst',
    text: 'Sieh auf einen Blick, wo Butter, Milch und Co. in deiner Nähe gerade am günstigsten sind.',
  },
  {
    icon: { ios: 'cart.fill', android: 'shopping_cart', web: 'shopping_cart' },
    title: 'Warenkorb clever aufteilen',
    text: 'Korbwert rechnet aus, ob sich ein Markt reicht oder ob zwei Märkte zusammen günstiger sind.',
  },
  {
    icon: { ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' },
    title: 'Ehrliche Preise mit Quelle und Datum',
    text: 'Jeder Preis zeigt, woher er stammt und wann er beobachtet wurde. Im Markt kann er abweichen.',
  },
];

// Kurzer Start: Nutzen zeigen, dann PLZ und Märkte optional einrichten.
export function Onboarding() {
  const { storesFromOsm, completeOnboarding } = useAppState();
  const [selectedStep, setStep] = useState<Step>('intro');
  const step: Step = selectedStep === 'location' && storesFromOsm ? 'stores' : selectedStep;

  if (step === 'intro') {
    return <Intro onDone={() => setStep('location')} onSkip={completeOnboarding} />;
  }
  if (step === 'location') {
    return (
      <View style={{ flex: 1 }}>
        <LocationSetup />
        <View style={{ position: 'absolute', right: 0, bottom: 0, left: 0, padding: Spacing.four, paddingBottom: Spacing.five, backgroundColor: Colors.background }}>
          <SecondaryButton label="Standort später einrichten" onPress={completeOnboarding} />
        </View>
      </View>
    );
  }

  const progress = PROGRESS_STEPS.indexOf(step);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ flexDirection: 'row', gap: Spacing.one, paddingHorizontal: Spacing.five, paddingTop: Spacing.three }}>
        {PROGRESS_STEPS.map((item, index) => (
          <View key={item} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: index <= progress ? Colors.primary : Colors.border }} />
        ))}
      </View>
      {step === 'stores' ? <StoresStep onDone={completeOnboarding} onSkip={completeOnboarding} /> : null}
    </SafeAreaView>
  );
}

function Intro({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
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
        <Pressable onPress={onSkip} hitSlop={10} accessibilityRole="button">
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

function StoresStep({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const { stores, activeStoreIds, toggleStore, location } = useAppState();

  return (
    <ScrollView contentContainerStyle={{ padding: Spacing.five, gap: Spacing.five }}>
      <StepHeader
        icon={{ ios: 'storefront.fill', android: 'storefront', web: 'storefront' }}
        title="Deine Märkte (optional)"
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
      <SecondaryButton label="Märkte später auswählen" onPress={onSkip} />
    </ScrollView>
  );
}
