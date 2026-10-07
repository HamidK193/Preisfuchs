import { DefaultTheme, Stack, ThemeProvider, type NativeStackNavigationOptions } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { LocationSetup } from '@/components/location-setup';
import { Colors } from '@/constants/theme';
import { AppStateProvider, useAppState } from '@/state/app-state';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: Colors.background, primary: Colors.primary },
};

// Unterseiten: grosser iOS-Titel, weisser Kopf ohne Trennlinie.
const pageOptions: NativeStackNavigationOptions = {
  contentStyle: { backgroundColor: Colors.background },
  headerLargeTitle: true,
  headerShadowVisible: false,
  headerLargeTitleShadowVisible: false,
  headerStyle: { backgroundColor: Colors.background },
  headerTintColor: Colors.primary,
  headerTitleStyle: { color: Colors.text },
  headerLargeTitleStyle: { color: Colors.text },
};

// Bottom-Sheets. Ohne feste Hoehe bleibt der Sheet-Inhalt leer (Layout-Hoehe 0).
function sheetOptions(detents: number[]): NativeStackNavigationOptions {
  return {
    presentation: 'formSheet',
    headerShown: false,
    contentStyle: { backgroundColor: Colors.background, height: '100%' },
    sheetAllowedDetents: detents,
    sheetGrabberVisible: true,
    sheetCornerRadius: 5,
  };
}

// Die Tabs erst zeigen, wenn der gespeicherte Zustand geladen ist. Sonst aendert sich
// der Warenkorb-Badge direkt nach dem Start, und iOS 26 kuerzt die Tab-Beschriftungen
// (react-native-screens #4749).
function AppNavigator() {
  const { loaded, storesFromOsm } = useAppState();

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  // Ohne festgelegten Standort zuerst nach dem Standort fragen.
  if (!storesFromOsm) {
    return <LocationSetup />;
  }

  return (
    <Stack screenOptions={pageOptions}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Zurück' }} />
      <Stack.Screen name="produkt/[id]" options={sheetOptions([0.6, 1])} />
      <Stack.Screen name="preisalarm/[id]" options={sheetOptions([0.9])} />
      <Stack.Screen name="konto" options={sheetOptions([0.7])} />
      <Stack.Screen name="plus" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="angebote" options={{ title: 'Angebote' }} />
      <Stack.Screen name="kategorie/[id]" options={{ title: 'Kategorie' }} />
      <Stack.Screen name="marktvergleich" options={{ title: 'Marktvergleich' }} />
      <Stack.Screen name="einkaufsmodus" options={{ title: 'Einkaufsmodus' }} />
      <Stack.Screen name="markt/[id]" options={{ title: 'Markt' }} />
      <Stack.Screen name="einstellungen/standort" options={{ title: 'Standort & Radius' }} />
      <Stack.Screen name="einstellungen/maerkte" options={{ title: 'Meine Märkte' }} />
      <Stack.Screen name="einstellungen/mitteilungen" options={{ title: 'Mitteilungen' }} />
      <Stack.Screen name="einstellungen/datenschutz" options={{ title: 'Datenschutz & Werbung' }} />
      <Stack.Screen name="einstellungen/datenquellen" options={{ title: 'Datenquellen' }} />
      <Stack.Screen name="einstellungen/hilfe" options={{ title: 'Hilfe & Feedback' }} />
      <Stack.Screen name="einstellungen/rechtliches" options={{ title: 'Rechtliches' }} />
      <Stack.Screen name="einstellungen/dokument/[doc]" options={{ headerLargeTitle: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider value={theme}>
      <AppStateProvider>
        <StatusBar style="dark" />
        <AppNavigator />
      </AppStateProvider>
    </ThemeProvider>
  );
}
