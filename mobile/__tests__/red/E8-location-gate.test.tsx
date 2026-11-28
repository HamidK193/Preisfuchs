import { renderAsync, screen } from '@testing-library/react-native';
import RootLayout from '@/app/_layout';

jest.mock('expo-router', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    DefaultTheme: { colors: {} },
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
    Stack: Object.assign(() => React.createElement(Text, null, 'Produktansicht'), { Screen: () => null }),
  };
});
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hideAsync: jest.fn() }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('@/components/system-states', () => ({ ErrorState: () => null }));
jest.mock('@/components/onboarding', () => ({ Onboarding: () => null }));
jest.mock('@/components/location-setup', () => ({ LocationSetup: () => {
  const React = require('react');
  return React.createElement(require('react-native').Text, null, 'Standort-Pflicht');
} }));
jest.mock('@/state/app-state', () => ({
  AppStateProvider: ({ children }: { children: React.ReactNode }) => children,
  useAppState: () => ({ loaded: true, onboarded: true, storesFromOsm: false }),
}));
jest.mock('@/state/family-state', () => ({ FamilyProvider: ({ children }: { children: React.ReactNode }) => children }));

test('E8: after skipping onboarding, an absent location cannot block the first product view', async () => {
  await renderAsync(<RootLayout />);
  expect(screen.getByText('Produktansicht')).toBeOnTheScreen();
  expect(screen.queryByText('Standort-Pflicht')).not.toBeOnTheScreen();
});
