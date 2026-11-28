import './native-mocks';
import { renderAsync, screen, userEvent } from '@testing-library/react-native';
import { Onboarding } from '@/components/onboarding';
import { mockState } from './fixtures';

test('E8: a fresh install reaches products by skipping without an account or location gate', async () => {
  mockState.completeOnboarding.mockClear();
  await renderAsync(<Onboarding />);
  const user = userEvent.setup();
  await user.press(screen.getByText('Überspringen'));
  // One tap is within the <=3-tap acceptance budget; skipping completes the whole flow.
  expect(mockState.completeOnboarding).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Willkommen bei Korbwert')).not.toBeOnTheScreen();
});
