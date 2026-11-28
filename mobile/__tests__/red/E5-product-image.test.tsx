import './native-mocks';
import { fireEventAsync, renderAsync, screen } from '@testing-library/react-native';
import { ProductCard } from '@/components/product-card';
import { testProduct } from './fixtures';

test('E5: OFF product images use the persistent expo-image cache', async () => {
  await renderAsync(<ProductCard product={testProduct} />);
  const image = screen.getAllByRole('image').find((node) => node.props.source === testProduct.imageUrl);
  expect(image).toBeDefined();
  expect(image).toHaveProp('cachePolicy', 'memory-disk');
});

test('E5: an OFF image load error replaces the broken photo with an accessible placeholder', async () => {
  await renderAsync(<ProductCard product={testProduct} />);
  const image = screen.getAllByRole('image').find((node) => node.props.source === testProduct.imageUrl);
  expect(image).toBeDefined();
  await fireEventAsync(image!, 'error', { error: 'offline' });
  expect(await screen.findByLabelText('Kein Produktbild verfügbar')).toBeOnTheScreen();
});
