import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { SheetScroll } from '@/components/sheet';
import { AppText, FoxLogo, Icon, StoreBadge } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import { getProduct } from '@/data/products';
import type { StoreId } from '@/data/stores';
import { formatEuro } from '@/lib/pricing';
import { sendPriceReport, type PriceReport } from '@/lib/reports';
import { useAppState } from '@/state/app-state';

type Photo = NonNullable<PriceReport['photo']>;

const inputStyle = {
  borderWidth: 1,
  borderColor: Colors.border,
  borderRadius: Radius.medium,
  paddingHorizontal: Inset.card,
  height: 50,
  fontSize: 16,
  color: Colors.text,
} as const;

const SUCCESS_TEXT: Record<string, string> = {
  second_report: 'Eine zweite Meldung hat den Preis bestätigt – er ist jetzt für alle sichtbar.',
  photo: 'Dein Foto hat den Preis bestätigt – er ist jetzt für alle sichtbar.',
  no_verified_article: 'Der Preis ist bestätigt. Sichtbar wird er, sobald das Produkt in unserem Katalog geprüft ist.',
  photo_price_implausible: 'Der Preis weicht stark ab und wird von Hand geprüft.',
};

// Datum im Format JJJJ-MM-TT aus "TT.MM." bzw. "TT.MM.JJJJ".
function toIsoDate(input: string): string | undefined {
  const match = input.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})?$/);
  if (!match) return undefined;
  const year = match[3] ?? String(new Date().getFullYear());
  return `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
}

export default function PriceReportSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = getProduct(id);
  const { stores, activeStoreIds } = useAppState();
  const reportable = stores.filter((store) => activeStoreIds.includes(store.id) && store.uuid);
  const [storeId, setStoreId] = useState<StoreId | undefined>(reportable[0]?.id);
  const [price, setPrice] = useState('');
  const [isOffer, setIsOffer] = useState(false);
  const [validUntil, setValidUntil] = useState('');
  const [photo, setPhoto] = useState<Photo & { uri: string }>();
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [resultText, setResultText] = useState('');
  const [error, setError] = useState<string | undefined>();

  if (!product) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <AppText weight="bold">Produkt nicht gefunden.</AppText>
      </View>
    );
  }

  const store = reportable.find((item) => item.id === storeId);
  const parsedPrice = Number(price.replace(',', '.'));
  const priceValid = Number.isFinite(parsedPrice) && parsedPrice > 0 && parsedPrice < 1000;
  const validUntilIso = isOffer && validUntil.trim() ? toIsoDate(validUntil) : undefined;
  const dateValid = !isOffer || !validUntil.trim() || Boolean(validUntilIso);
  const canReport = Boolean(product.gtin) && reportable.length > 0;
  const valid = canReport && Boolean(store) && priceValid && dateValid;
  const current = storeId ? product.prices.find((item) => item.storeId === storeId) : undefined;

  const pickPhoto = async (source: 'camera' | 'library') => {
    setError(undefined);
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError('Ohne Kamerafreigabe kannst du ein Foto aus deiner Mediathek wählen.');
        return;
      }
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], base64: true, quality: 0.5, allowsEditing: true };
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset?.base64) return;
    const mime = asset.mimeType === 'image/png' || asset.mimeType === 'image/webp' ? asset.mimeType : 'image/jpeg';
    if (asset.base64.length > 3_900_000) {
      setError('Das Foto ist zu groß. Bitte nimm einen kleineren Ausschnitt.');
      return;
    }
    setPhoto({ uri: asset.uri, base64: asset.base64, mime });
  };

  const submit = async () => {
    if (!store?.uuid || !product.gtin) return;
    setError(undefined);
    setState('sending');
    const result = await sendPriceReport({
      gtin: product.gtin,
      storeUuid: store.uuid,
      price: Math.round(parsedPrice * 100) / 100,
      isOffer,
      validUntil: validUntilIso,
      productName: `${product.brand} ${product.name}`.trim(),
      photo: photo ? { base64: photo.base64, mime: photo.mime } : undefined,
    });
    if (result.status === 'sent') {
      setResultText(
        (result.reason && SUCCESS_TEXT[result.reason]) ??
          'Wir prüfen deine Meldung. Sobald ein zweites Gerät denselben Preis meldet oder ein Foto ihn bestätigt, sehen ihn alle.',
      );
      setState('done');
    } else if (result.status === 'not_available') {
      setError('Preismeldungen sind gerade nicht erreichbar.');
      setState('idle');
    } else {
      setError(result.message);
      setState('idle');
    }
  };

  if (state === 'done') {
    return (
      <SheetScroll contentContainerStyle={{ padding: Spacing.five, paddingTop: Spacing.six, gap: Spacing.four, alignItems: 'center' }}>
        <FoxLogo size={88} />
        <AppText weight="extrabold" size={24} style={{ textAlign: 'center' }}>
          Danke für deine Meldung!
        </AppText>
        <AppText size={15} color={Colors.textSecondary} style={{ textAlign: 'center' }}>
          {resultText}
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
            {product.gtin ? ` · EAN ${product.gtin}` : ''}
          </AppText>
        </View>
      </View>

      {!canReport ? (
        <View style={{ backgroundColor: Colors.tile, borderRadius: Radius.large, padding: Inset.card, gap: Spacing.two }}>
          <AppText weight="bold" size={15}>
            Für dieses Produkt geht das noch nicht
          </AppText>
          <AppText size={13} color={Colors.textSecondary}>
            {product.gtin
              ? 'Lege zuerst unter Profil → Standort & Radius deinen Standort fest, damit wir deine Märkte kennen.'
              : 'Das ist ein Demo-Produkt ohne Barcode. Melden kannst du Produkte mit echten Preisen.'}
          </AppText>
        </View>
      ) : (
        <>
          <View style={{ gap: Spacing.three }}>
            <AppText weight="bold" size={13} color={Colors.textSecondary}>
              IN WELCHEM MARKT?
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
              {reportable.map((item) => {
                const selected = storeId === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setStoreId(item.id)}
                    style={{
                      width: '31.5%',
                      alignItems: 'center',
                      gap: Spacing.two,
                      paddingVertical: Inset.compact,
                      borderRadius: Radius.medium,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? Colors.primary : Colors.border,
                    }}>
                    <StoreBadge storeId={item.id} size="large" />
                    <AppText weight="semibold" size={12}>
                      {item.name}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            {store ? (
              <AppText size={12} color={Colors.textSecondary}>
                Filiale: {store.address}
                {current ? ` · bisher bekannt: ${formatEuro(current.price)}` : ''}
              </AppText>
            ) : null}
          </View>

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

          <Pressable
            onPress={() => setIsOffer(!isOffer)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Inset.row, borderRadius: Radius.large, borderWidth: 1, borderColor: isOffer ? Colors.primary : Colors.border, backgroundColor: isOffer ? Colors.primarySoft : Colors.card }}>
            <Icon
              name={isOffer ? { ios: 'checkmark.square.fill', android: 'check_box', web: 'check_box' } : { ios: 'square', android: 'check_box_outline_blank', web: 'check_box_outline_blank' }}
              size={22}
              color={isOffer ? Colors.primary : Colors.textSecondary}
            />
            <View style={{ flex: 1 }}>
              <AppText weight="bold" size={15}>
                Das ist ein Angebot
              </AppText>
              <AppText size={12} color={Colors.textSecondary}>
                Aktionspreis mit Gültigkeit, z. B. aus dem Prospekt
              </AppText>
            </View>
          </Pressable>
          {isOffer ? (
            <TextInput
              value={validUntil}
              onChangeText={setValidUntil}
              placeholder="Gültig bis (optional), z. B. 11.10."
              placeholderTextColor={Colors.textSecondary}
              style={[inputStyle, { borderColor: dateValid ? Colors.border : Colors.danger }]}
            />
          ) : null}

          <View style={{ gap: Spacing.two }}>
            <AppText weight="bold" size={13} color={Colors.textSecondary}>
              FOTO VOM PREISSCHILD (OPTIONAL)
            </AppText>
            {photo ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
                <Image source={photo.uri} style={{ width: 72, height: 72, borderRadius: Radius.medium }} contentFit="cover" />
                <Pressable onPress={() => setPhoto(undefined)} hitSlop={6}>
                  <AppText weight="bold" size={14} color={Colors.danger}>
                    Foto entfernen
                  </AppText>
                </Pressable>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                {(['camera', 'library'] as const).map((source) => (
                  <Pressable
                    key={source}
                    onPress={() => pickPhoto(source)}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingVertical: Inset.compact, borderRadius: Radius.medium, borderWidth: 1, borderColor: Colors.border }}>
                    <Icon
                      name={source === 'camera' ? { ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' } : { ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' }}
                      size={16}
                      color={Colors.text}
                    />
                    <AppText weight="bold" size={14}>
                      {source === 'camera' ? 'Aufnehmen' : 'Auswählen'}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            )}
            <AppText size={12} color={Colors.textSecondary}>
              Ein Foto bestätigt den Preis schneller. Bitte nur das Preisschild – keine Gesichter, keine Kartendaten.
            </AppText>
          </View>

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
        </>
      )}

      <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' }}>
        <Icon name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} size={13} color={Colors.textSecondary} />
        <AppText size={12} color={Colors.textSecondary} style={{ flex: 1 }}>
          Ohne Konto. Gespeichert wird nur eine anonyme Geräte-Kennung. Meldungen werden erst nach Bestätigung für alle sichtbar.
        </AppText>
      </View>
    </SheetScroll>
  );
}
