import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { SheetScroll } from '@/components/sheet';
import { AppText, FoxLogo, Icon, StoreBadge } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import { getProduct } from '@/data/products';
import type { StoreId } from '@/data/stores';
import { formatEuro } from '@/lib/pricing';
import { sendPriceReport, type ReportKind } from '@/lib/reports';
import { useAppState } from '@/state/app-state';

const KINDS: { id: ReportKind; label: string; hint: string }[] = [
  { id: 'falscher_preis', label: 'Preis ist falsch', hint: 'Im Markt kostet es etwas anderes' },
  { id: 'neuer_preis', label: 'Neuer Preis entdeckt', hint: 'Z. B. ein Angebot, das hier fehlt' },
  { id: 'nicht_verfuegbar', label: 'Nicht verfügbar', hint: 'Der Markt führt das Produkt nicht' },
];

const inputStyle = {
  borderWidth: 1,
  borderColor: Colors.border,
  borderRadius: Radius.medium,
  paddingHorizontal: Inset.card,
  height: 50,
  fontSize: 16,
  color: Colors.text,
} as const;

export default function PriceReportSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = getProduct(id);
  const { stores, activeStoreIds } = useAppState();
  const nearby = stores.filter((store) => activeStoreIds.includes(store.id));
  const [kind, setKind] = useState<ReportKind>('falscher_preis');
  const [storeId, setStoreId] = useState<StoreId | undefined>(nearby[0]?.id);
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'later'>('idle');
  const [error, setError] = useState<string | undefined>();

  if (!product) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <AppText weight="bold">Produkt nicht gefunden.</AppText>
      </View>
    );
  }

  const parsedPrice = Number(price.replace(',', '.'));
  const needsPrice = kind !== 'nicht_verfuegbar';
  const valid = Boolean(storeId) && (!needsPrice || (Number.isFinite(parsedPrice) && parsedPrice > 0 && parsedPrice < 1000));
  const current = storeId ? product.prices.find((item) => item.storeId === storeId) : undefined;

  const submit = async () => {
    if (!storeId) return;
    setError(undefined);
    setState('sending');
    const result = await sendPriceReport({
      productId: product.id,
      storeId,
      kind,
      price: needsPrice ? Math.round(parsedPrice * 100) / 100 : undefined,
      note: note.trim() || undefined,
    });
    if (result.status === 'sent') setState('sent');
    else if (result.status === 'not_available') setState('later');
    else {
      setError(result.message);
      setState('idle');
    }
  };

  if (state === 'sent' || state === 'later') {
    return (
      <SheetScroll contentContainerStyle={{ padding: Spacing.five, paddingTop: Spacing.six, gap: Spacing.four, alignItems: 'center' }}>
        <FoxLogo size={88} />
        <AppText weight="extrabold" size={24} style={{ textAlign: 'center' }}>
          {state === 'sent' ? 'Danke für deine Meldung!' : 'Danke – bald geht das direkt'}
        </AppText>
        <AppText size={15} color={Colors.textSecondary} style={{ textAlign: 'center' }}>
          {state === 'sent'
            ? 'Wir prüfen sie. Sobald eine zweite Meldung oder ein Foto den Preis bestätigt, sehen ihn alle.'
            : 'Preismeldungen werden gerade eingerichtet. In der nächsten Version wird deine Meldung direkt übertragen.'}
        </AppText>
        <Pressable onPress={() => router.back()} style={{ backgroundColor: Colors.primary, borderRadius: Radius.pill, paddingVertical: Inset.buttonV, paddingHorizontal: Inset.buttonH }}>
          <AppText weight="bold" size={15} color="#FFFFFF">
            Fertig
          </AppText>
        </Pressable>
      </SheetScroll>
    );
  }

  return (
    <SheetScroll keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: Spacing.four, paddingTop: Spacing.five, gap: Spacing.five, paddingBottom: Spacing.six }}>
      <AppText weight="extrabold" size={24}>
        Preis melden
      </AppText>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
        <Image source={product.imageUrl} style={{ width: 56, height: 56, borderRadius: Radius.medium }} contentFit="cover" />
        <View style={{ flex: 1 }}>
          <AppText weight="bold" size={15}>
            {product.brand} {product.name}
          </AppText>
          <AppText size={13} color={Colors.textSecondary}>
            {product.packageSize}
          </AppText>
        </View>
      </View>

      <View style={{ gap: Spacing.two }}>
        {KINDS.map((item) => {
          const selected = kind === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setKind(item.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.three,
                padding: Inset.row,
                borderRadius: Radius.large,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? Colors.primary : Colors.border,
                backgroundColor: selected ? Colors.primarySoft : Colors.card,
              }}>
              <Icon
                name={selected ? { ios: 'largecircle.fill.circle', android: 'radio_button_checked', web: 'radio_button_checked' } : { ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' }}
                size={20}
                color={selected ? Colors.primary : Colors.textSecondary}
              />
              <View style={{ flex: 1 }}>
                <AppText weight="bold" size={15}>
                  {item.label}
                </AppText>
                <AppText size={12} color={Colors.textSecondary}>
                  {item.hint}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: Spacing.three }}>
        <AppText weight="bold" size={13} color={Colors.textSecondary}>
          IN WELCHEM MARKT?
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
          {nearby.map((store) => {
            const selected = storeId === store.id;
            return (
              <Pressable
                key={store.id}
                onPress={() => setStoreId(store.id)}
                style={{
                  width: '31.5%',
                  alignItems: 'center',
                  gap: Spacing.two,
                  paddingVertical: Inset.compact,
                  borderRadius: Radius.medium,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? Colors.primary : Colors.border,
                }}>
                <StoreBadge storeId={store.id} size="large" />
                <AppText weight="semibold" size={12}>
                  {store.name}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        {current ? (
          <AppText size={12} color={Colors.textSecondary}>
            Bisher bekannt: {formatEuro(current.price)}
          </AppText>
        ) : null}
      </View>

      {needsPrice ? (
        <View style={{ gap: Spacing.two }}>
          <AppText weight="bold" size={13} color={Colors.textSecondary}>
            PREIS IM MARKT
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
            <TextInput
              value={price}
              onChangeText={(text) => setPrice(text.replace(/[^0-9,.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder="z. B. 1,49"
              placeholderTextColor={Colors.textSecondary}
              style={[inputStyle, { flex: 1, fontWeight: '700', fontSize: 20 }]}
            />
            <AppText weight="bold" size={20}>
              €
            </AppText>
          </View>
        </View>
      ) : null}

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Anmerkung (optional), z. B. „nur mit App-Coupon“"
        placeholderTextColor={Colors.textSecondary}
        multiline
        maxLength={200}
        style={[inputStyle, { height: 80, paddingTop: Inset.compact, textAlignVertical: 'top' }]}
      />

      {error ? (
        <AppText size={13} color={Colors.danger}>
          {error}
        </AppText>
      ) : null}

      <Pressable
        disabled={!valid || state === 'sending'}
        onPress={submit}
        style={{ backgroundColor: !valid ? Colors.border : Colors.primary, borderRadius: Radius.pill, paddingVertical: Inset.buttonV, alignItems: 'center' }}>
        <AppText weight="bold" size={15} color="#FFFFFF">
          {state === 'sending' ? 'Wird gesendet …' : 'Meldung senden'}
        </AppText>
      </Pressable>

      <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' }}>
        <Icon name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} size={13} color={Colors.textSecondary} />
        <AppText size={12} color={Colors.textSecondary} style={{ flex: 1 }}>
          Ohne Konto und ohne persönliche Daten. Meldungen werden erst nach Bestätigung für alle sichtbar.
        </AppText>
      </View>
    </SheetScroll>
  );
}
