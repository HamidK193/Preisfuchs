import './red/native-mocks';
import { fireEventAsync, renderAsync, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import TabLayout from '@/app/(tabs)/_layout';
import { HomeHeader } from '@/components/home-sections';

jest.mock('expo-router/unstable-native-tabs', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  const Container = ({ children }: { children: React.ReactNode }) => React.createElement(View, null, children);
  const Trigger = Object.assign(Container, {
    Label: ({ children }: { children: React.ReactNode }) => React.createElement(Text, null, children),
    Badge: ({ children }: { children: React.ReactNode }) => React.createElement(Text, { accessibilityLabel: 'Listenanzahl' }, children),
    Icon: () => null,
  });
  return { NativeTabs: Object.assign(Container, { Trigger }) };
});

test('E1: five tabs retain the list badge in the required order', async () => {
  await renderAsync(<TabLayout />);
  expect(screen.getAllByText(/^(Start|Suche|Angebote|Liste|Profil)$/).map((node) => node.props.children))
    .toEqual(['Start', 'Suche', 'Angebote', 'Liste', 'Profil']);
  expect(screen.getByLabelText('Listenanzahl')).toHaveTextContent('3');
});

test('E2/E3: focusing the real home input forwards keyboard focus to the search tab', async () => {
  await renderAsync(<HomeHeader />);
  await fireEventAsync(screen.getByLabelText('Produkt oder Marke suchen'), 'focus');
  expect(router.navigate).toHaveBeenCalledWith({ pathname: '/suche', params: { focus: expect.any(String) } });
});
