import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { SheetScroll } from '@/components/sheet';
import { AppText, Icon, StoreBadge } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import { getProduct } from '@/data/products';
import type { StoreId } from '@/data/stores';
import { cheapestPrice, formatEuro } from '@/lib/pricing';
import { FREE_ALARM_LIMIT, useAppState } from '@/state/app-state';

const STEP = 0.1;

function StepButton({ label, accessibilityLabel, onPress }: { label: string; accessibilityLabel: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.tile, alignItems: 'center', justifyContent: 'center' }}>
      <AppText weight="bold" size={22}>
        {label}
      </AppText>
    </Pressable>
  );
}

export default function PriceAlarmSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = getProduct(id);
  const { alarms, saveAlarm, removeAlarm, activeStoreIds, stores, getStore } = useAppState();
  const existing = alarms.find((item) => item.productId === id);
  const best = product ? cheapestPrice(product, activeStoreIds) : undefined;

  const [target, setTarget] = useState(() => existing?.targetPrice ?? Math.max(0.1, Math.round(((best?.price ?? 1) - STEP) * 10) / 10));
  const [storeIds, setStoreIds] = useState<StoreId[]>(existing?.storeIds ?? activeStoreIds);
  const [push, setPush] = useState(existing?.push ?? true);

  if (!product || !best) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <AppText weight="bold">Produkt nicht gefunden.</AppText>
      </View>
    );
  }

  const lowest = Math.min(...product.history, best.price);
  const usedOther = alarms.filter((item) => item.productId !== product.id).length;
  const limitReached = !existing && usedOther >= FREE_ALARM_LIMIT;

  const toggle = (storeId: StoreId) =>
    setStoreIds((current) => (current.includes(storeId) ? current.filter((item) => item !== storeId) : [...current, storeId]));

  const changeTarget = (delta: number) => setTarget((current) => Math.max(0.1, Math.round((current + delta) * 100) / 100));

  return (
    <SheetScroll contentContainerStyle={{ padding: Spacing.four, paddingTop: Spacing.five, gap: Spacing.five, paddingBottom: Spacing.six }}>
      <AppText weight="extrabold" size={24}>
        Preisalarm setzen
      </AppText>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
        <Image source={product.imageUrl} style={{ width: 56, height: 56, borderRadius: Radius.medium }} contentFit="cover" />
        <View style={{ flex: 1 }}>
          <AppText weight="bold" size={15}>
            {product.brand} {product.name} {product.packageSize}
          </AppText>
          <AppText size={13} color={Colors.textSecondary}>
            aktuell ab {formatEuro(best.price)} bei {getStore(best.storeId).name}
          </AppText>
        </View>
      </View>

      <View style={{ gap: Spacing.three }}>
        <AppText weight="bold" size={13} color={Colors.textSecondary}>
          BENACHRICHTIGE MICH UNTER
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.large, padding: Inset.card }}>
          <StepButton label="−" accessibilityLabel="Wunschpreis senken" onPress={() => changeTarget(-STEP)} />
          <AppText weight="extrabold" size={34}>
            {formatEuro(target)}
          </AppText>
          <StepButton label="+" accessibilityLabel="Wunschpreis erhöhen" onPress={() => changeTarget(STEP)} />
        </View>
        <AppText size={13} color={Colors.greenText}>
          Tiefstpreis der letzten 8 Wochen: {formatEuro(lowest)}
        </AppText>
      </View>

      <View style={{ gap: Spacing.three }}>
        <AppText weight="bold" size={13} color={Colors.textSecondary}>
          IN DIESEN MÄRKTEN
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
          {stores.map((store) => {
            const selected = storeIds.includes(store.id);
            return (
              <Pressable
                key={store.id}
                onPress={() => toggle(store.id)}
                style={{
                  width: '31.5%',
                  alignItems: 'center',
                  gap: Spacing.two,
                  paddingVertical: Inset.compact,
                  borderRadius: Radius.medium,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? Colors.primary : Colors.border,
                  opacity: selected ? 1 : 0.55,
                }}>
                <StoreBadge storeId={store.id} size="large" />
                <AppText weight="semibold" size={12}>
                  {store.name}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.large, padding: Inset.row }}>
        <Icon name={{ ios: 'bell.badge', android: 'notifications_active', web: 'notifications_active' }} size={20} color={Colors.primary} />
        <View style={{ flex: 1 }}>
          <AppText weight="semibold" size={15}>
            Push-Mitteilung
          </AppText>
          <AppText size={12} color={Colors.textSecondary}>
            Mitteilungen folgen in einer späteren Version.
          </AppText>
        </View>
        <Switch value={push} onValueChange={setPush} trackColor={{ true: Colors.primary }} />
      </View>

      {limitReached ? (
        <View style={{ backgroundColor: Colors.primarySoft, borderRadius: Radius.large, padding: Inset.card, gap: 4 }}>
          <AppText weight="bold" size={14} color={Colors.primaryDark}>
            {FREE_ALARM_LIMIT} von {FREE_ALARM_LIMIT} kostenlosen Alarmen genutzt
          </AppText>
          <AppText size={13} color={Colors.primaryDark}>
            Mit Preisfuchs Plus werden Preisalarme unbegrenzt – bald verfügbar.
          </AppText>
        </View>
      ) : null}

      <Pressable
        disabled={limitReached || storeIds.length === 0}
        onPress={() => {
          saveAlarm({ productId: product.id, targetPrice: target, storeIds, push });
          router.back();
        }}
        style={{
          backgroundColor: limitReached || storeIds.length === 0 ? Colors.border : Colors.primary,
          borderRadius: Radius.pill,
          paddingVertical: Inset.buttonV,
          alignItems: 'center',
        }}>
        <AppText weight="bold" size={15} color="#FFFFFF">
          {existing ? 'Alarm aktualisieren' : 'Alarm speichern'}
        </AppText>
      </Pressable>

      {existing ? (
        <Pressable
          onPress={() => {
            removeAlarm(product.id);
            router.back();
          }}
          style={{ alignItems: 'center' }}>
          <AppText weight="bold" size={14} color={Colors.danger}>
            Alarm löschen
          </AppText>
        </Pressable>
      ) : (
        <AppText size={12} color={Colors.textSecondary} style={{ textAlign: 'center' }}>
          {usedOther} von {FREE_ALARM_LIMIT} kostenlosen Alarmen genutzt – mit Plus unbegrenzt
        </AppText>
      )}
    </SheetScroll>
  );
}
