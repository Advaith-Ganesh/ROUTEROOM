import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './utils';
import { CreateTripModal } from '../components/CreateTripModal';

vi.mock('../api/places', () => ({
  placesApi: {
    search: vi.fn(async () => ({
      results: [
        {
          externalId: '1',
          name: 'Paris',
          address: 'Paris, France',
          category: 'city',
          lat: 48.8566,
          lon: 2.3522,
        },
      ],
    })),
  },
}));

const createMock = vi.fn(async (..._args: unknown[]) => ({ trip: { id: 'trip-1' } }));
vi.mock('../api/trips', () => ({
  tripsApi: {
    create: (...args: unknown[]) => createMock(...args),
  },
}));

describe('CreateTripModal', () => {
  it('lets the user search for a destination and submit a new trip', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<CreateTripModal onClose={onClose} />);

    await user.type(screen.getByPlaceholderText('London Summer Trip'), 'Paris Weekend');
    await user.type(screen.getByPlaceholderText('Search for a city...'), 'Paris');

    await waitFor(() => expect(screen.getByText('Paris')).toBeInTheDocument(), { timeout: 2000 });
    await user.click(screen.getByText('Paris'));

    const [startInput, endInput] = document.querySelectorAll('input[type="date"]');
    await user.type(startInput as HTMLInputElement, '2027-06-10');
    await user.type(endInput as HTMLInputElement, '2027-06-14');

    await user.click(screen.getByRole('button', { name: 'Create trip' }));

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Paris Weekend',
        destinationName: 'Paris',
        destinationLat: 48.8566,
        destinationLon: 2.3522,
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('shows a validation error when submitting without picking a destination', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateTripModal onClose={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('London Summer Trip'), 'No Destination Trip');
    const [startInput, endInput] = document.querySelectorAll('input[type="date"]');
    await user.type(startInput as HTMLInputElement, '2027-06-10');
    await user.type(endInput as HTMLInputElement, '2027-06-14');

    await user.click(screen.getByRole('button', { name: 'Create trip' }));

    expect(await screen.findByText(/search for a destination/i)).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });
});
