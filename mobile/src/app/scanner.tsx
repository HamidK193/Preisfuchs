import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton, SecondaryButton } from '@/components/settings';
import { EmptyState } from '@/components/system-states';
import { AppText, Icon } from '@/components/ui';
import { Colors, Inset, Radius, Spacing } from '@/constants/theme';
import { products } from '@/data/products';
import { useAppState } from '@/state/app-state';

// UPC-A (12 Stellen) entspricht EAN-13 mit fuehrender Null.
function normalizeGtin(code: string): string {
  const digits = code.replace(/\D/g, '');
  return digits.length === 12 ? `0${digits}` : digits;
}

function CloseButton() {
  return (
    <Pressable
      onPress={() => router.back()}
      accessibilityLabel="Scanner schließen"
      hitSlop={10}
      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={{ ios: 'xmark', android: 'close', web: 'close' }} size={18} color="#FFFFFF" />
    </Pressable>
  );
}

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const { addRecentSearch } = useAppState();
  const [notFound, setNotFound] = useState<string | undefined>();
  const [manual, setManual] = useState('');

  const lookUp = (code: string) => {
    const gtin = normalizeGtin(code);
    const product = products.find((item) => item.gtin === gtin);
    if (product) {
      addRecentSearch(product.name);
      router.replace({ pathname: '/produkt/[id]', params: { id: product.id } });
      return;
    }
    setNotFound(gtin);
  };

  // Nach einem Treffer nicht weiter scannen, bis der Nutzer es erneut versucht.
  const onScanned = (result: BarcodeScanningResult) => {
    if (!notFound) lookUp(result.data);
  };

  if (notFound) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background, padding: Spacing.five, justifyContent: 'center' }}>
        <EmptyState
          title="Dazu haben wir noch keine Preise"
          text={`Für den Barcode ${notFound} liegen noch keine Preisbeobachtungen vor. Versuch es mit dem Produktnamen in der Suche.`}>
          <View style={{ alignSelf: 'stretch', gap: Spacing.two, marginTop: Spacing.three }}>
            <PrimaryButton label="Erneut scannen" onPress={() => setNotFound(undefined)} />
            <SecondaryButton label="Nach Namen suchen" onPress={() => router.back()} />
          </View>
        </EmptyState>
      </SafeAreaView>
    );
  }

  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background, padding: Spacing.five, justifyContent: 'center', gap: Spacing.four }}>
        <View style={{ alignItems: 'center', gap: Spacing.three }}>
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={{ ios: 'barcode.viewfinder', android: 'barcode_scanner', web: 'barcode_scanner' }} size={44} color={Colors.primary} />
          </View>
          <AppText weight="extrabold" size={24} style={{ textAlign: 'center' }}>
            Barcode scannen
          </AppText>
          <AppText size={15} color={Colors.textSecondary} style={{ textAlign: 'center', lineHeight: 21 }}>
            Halte die Kamera auf den Strichcode einer Verpackung – Preisfuchs zeigt dir die Preise in deiner Nähe. Bilder werden
            nicht gespeichert.
          </AppText>
        </View>
        {permission.canAskAgain ? (
          <PrimaryButton label="Kamera erlauben" onPress={requestPermission} />
        ) : (
          <AppText size={14} color={Colors.warning} style={{ textAlign: 'center' }}>
            Die Kamera ist für Preisfuchs gesperrt. Du kannst sie in den iOS-Einstellungen freigeben oder den Barcode unten eintippen.
          </AppText>
        )}
        <ManualEntry value={manual} onChange={setManual} onSubmit={() => lookUp(manual)} />
        <SecondaryButton label="Abbrechen" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={onScanned}
      />
      {/* Ueberlagerung: Schliessen, Sucher-Rahmen und manuelle Eingabe */}
      <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between' }} pointerEvents="box-none">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.four }}>
          <AppText weight="bold" size={17} color="#FFFFFF">
            Barcode scannen
          </AppText>
          <CloseButton />
        </View>
        <View style={{ alignItems: 'center' }} pointerEvents="none">
          <View style={{ width: '78%', aspectRatio: 1.6, borderRadius: Radius.large, borderWidth: 3, borderColor: '#FFFFFF' }} />
          <AppText weight="semibold" size={14} color="#FFFFFF" style={{ marginTop: Spacing.three }}>
            Strichcode in den Rahmen halten
          </AppText>
        </View>
        <KeyboardAvoidingView behavior="padding">
          <View style={{ margin: Spacing.four, backgroundColor: Colors.background, borderRadius: Radius.large, padding: Inset.card, gap: Spacing.two }}>
            <ManualEntry value={manual} onChange={setManual} onSubmit={() => lookUp(manual)} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function ManualEntry({ value, onChange, onSubmit }: { value: string; onChange: (value: string) => void; onSubmit: () => void }) {
  const valid = [8, 12, 13].includes(value.length);
  return (
    <View style={{ gap: Spacing.two }}>
      <AppText weight="semibold" size={13} color={Colors.textSecondary}>
        Barcode lässt sich nicht scannen? Zahlen eintippen:
      </AppText>
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        <TextInput
          value={value}
          onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, 13))}
          keyboardType="number-pad"
          placeholder="z. B. 4008400401621"
          placeholderTextColor={Colors.textSecondary}
          onSubmitEditing={() => valid && onSubmit()}
          style={{
            flex: 1,
            height: 46,
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: Radius.medium,
            paddingHorizontal: Inset.compact,
            fontSize: 16,
            color: Colors.text,
            backgroundColor: Colors.card,
          }}
        />
        <Pressable
          onPress={onSubmit}
          disabled={!valid}
          style={{ height: 46, paddingHorizontal: Inset.card, borderRadius: Radius.medium, justifyContent: 'center', backgroundColor: valid ? Colors.primary : Colors.border }}>
          <AppText weight="bold" size={14} color="#FFFFFF">
            Suchen
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}
