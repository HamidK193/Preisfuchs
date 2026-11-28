import './native-mocks';
import { renderAsync, screen } from '@testing-library/react-native';
import ProductSheet from '@/app/produkt/[id]';

jest.mock('@/data/products', () => ({
  ...jest.requireActual('@/data/products'),
  getProduct: () => require('./fixtures').testProduct,
  products: [require('./fixtures').testProduct],
}));

test('E7: the initial compact sheet prioritizes all market prices and defers the history controls', async () => {
  await renderAsync(<ProductSheet />);
  expect(screen.getByText('Preise in deiner Nähe')).toBeVisible();
  expect(screen.getAllByText('Rewe').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Lidl').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Aldi Süd').length).toBeGreaterThan(0);
  // Charts and long history controls belong behind a disclosure/secondary route.
  // RNTL has no native layout engine: additionally check a 0.6-detent device screenshot.
  expect(screen.queryByText('8 Wochen')).not.toBeOnTheScreen();
  expect(screen.queryByText('6 Monate')).not.toBeOnTheScreen();
});
