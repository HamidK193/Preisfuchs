import './native-mocks';
import type { ComponentType } from 'react';
import { renderAsync, screen, userEvent } from '@testing-library/react-native';
import * as states from '@/components/system-states';

type StateProps = { status: 'loading' | 'empty' | 'offline'; title?: string; loadedAt?: string; onRetry?: () => void };

test('E9: one shared ListState supplies image skeletons, an actionable empty state and dated offline data', async () => {
  const ListState = (states as unknown as { ListState?: ComponentType<StateProps> }).ListState;
  // Missing behavior is an assertion failure, never a missing-module/TypeScript failure.
  expect(ListState).toBeDefined();
  const Component = ListState!;
  await renderAsync(<Component status="loading" />);
  expect(screen.getByLabelText('Produkte werden geladen')).toBeOnTheScreen();
  expect(screen.getAllByLabelText('Produktbild-Platzhalter').length).toBeGreaterThanOrEqual(2);
  const retry = jest.fn();
  await screen.rerenderAsync(<Component status="empty" title="Keine Produkte gefunden" onRetry={retry} />);
  expect(screen.getByText('Keine Produkte gefunden')).toBeOnTheScreen();
  await userEvent.setup().press(screen.getByRole('button', { name: 'Anderen Begriff versuchen' }));
  expect(retry).toHaveBeenCalledTimes(1);
  await screen.rerenderAsync(<Component status="offline" loadedAt="2026-11-27" onRetry={retry} />);
  expect(screen.getByText(/27\.11\.2026/)).toBeOnTheScreen();
  await userEvent.setup().press(screen.getByRole('button', { name: 'Erneut versuchen' }));
  expect(retry).toHaveBeenCalledTimes(2);
});

