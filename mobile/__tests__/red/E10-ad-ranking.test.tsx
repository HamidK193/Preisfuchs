import './native-mocks';
import type { ComponentType } from 'react';
import { renderAsync, screen, within } from '@testing-library/react-native';
import * as ui from '@/components/ui';
import type { Product } from '@/data/products';
import { testProduct } from './fixtures';

type RankingProps = { product: Product; showAd: boolean };

test('E10: an Anzeige slot stays outside the price list and cannot change ascending market order', async () => {
  const PriceRanking = (ui as unknown as { PriceRanking?: ComponentType<RankingProps> }).PriceRanking;
  expect(PriceRanking).toBeDefined();
  const Component = PriceRanking!;
  await renderAsync(<Component product={testProduct} showAd={false} />);
  const names = () => within(screen.getByLabelText('Preisvergleich')).getAllByLabelText(/Preis bei /).map((row) => row.props.accessibilityLabel);
  const before = names();
  expect(before).toEqual(['Preis bei Lidl', 'Preis bei Aldi Süd', 'Preis bei Rewe']);
  expect(screen.queryByText('Anzeige')).not.toBeOnTheScreen();
  await screen.rerenderAsync(<Component product={testProduct} showAd />);
  expect(screen.getByText('Anzeige')).toBeOnTheScreen();
  expect(within(screen.getByLabelText('Preisvergleich')).queryByText('Anzeige')).not.toBeOnTheScreen();
  expect(names()).toEqual(before);
});
