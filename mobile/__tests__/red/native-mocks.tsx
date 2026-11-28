// Keep application components real. Only replace native boundaries and unrelated services.
jest.mock('@/state/app-state', () => ({ useAppState: () => require('./fixtures').mockState }));
jest.mock('@/state/family-state', () => ({ useFamily: () => ({ session: null }) }));
jest.mock('@/lib/prices', () => ({ isStale: () => false }));
jest.mock('@/components/login-panel', () => ({ LoginPanel: () => null }));
jest.mock('@/components/location-setup', () => ({ LocationSetup: () => null }));
jest.mock('@/components/price-chart', () => ({ PriceChart: () => null }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), navigate: jest.fn() },
  useLocalSearchParams: () => ({ id: 'ux-test-product' }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/components/sheet', () => ({
  SheetScroll: ({ children, footer, ...props }: { children: React.ReactNode; footer: React.ReactNode }) => {
    const React = require('react');
    const { ScrollView, View } = require('react-native');
    return React.createElement(View, null, React.createElement(ScrollView, props, children), footer);
  },
}));
jest.mock('expo-image', () => ({
  // Forward cachePolicy/source/onError unchanged; no fake caching or fallback behavior.
  Image: (props: Record<string, unknown>) => {
    const React = require('react');
    return React.createElement(require('react-native').View, { ...props, accessible: true, accessibilityRole: 'image' });
  },
}));
