import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from './utils';
import { DashboardPage } from '../pages/DashboardPage';

const listMock = vi.fn();
vi.mock('../api/trips', () => ({
  tripsApi: {
    list: (...args: unknown[]) => listMock(...args),
  },
}));

describe('DashboardPage', () => {
  it('shows an empty state for a user with no trips', async () => {
    listMock.mockResolvedValue({ trips: [] });
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText('No trips yet')).toBeInTheDocument();
  });

  it('splits trips into upcoming and past sections', async () => {
    const past = new Date();
    past.setFullYear(past.getFullYear() - 1);
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);

    listMock.mockResolvedValue({
      trips: [
        {
          id: 'past-1',
          name: 'Old Trip',
          destinationName: 'Rome',
          destinationLat: 41.9,
          destinationLon: 12.5,
          startDate: past.toISOString(),
          endDate: past.toISOString(),
          ownerId: 'u1',
          createdAt: past.toISOString(),
          updatedAt: past.toISOString(),
          role: 'OWNER',
          activityCount: 0,
          memberCount: 1,
        },
        {
          id: 'future-1',
          name: 'Next Trip',
          destinationName: 'Berlin',
          destinationLat: 52.5,
          destinationLon: 13.4,
          startDate: future.toISOString(),
          endDate: future.toISOString(),
          ownerId: 'u1',
          createdAt: future.toISOString(),
          updatedAt: future.toISOString(),
          role: 'OWNER',
          activityCount: 2,
          memberCount: 1,
        },
      ],
    });

    renderWithProviders(<DashboardPage />);

    await waitFor(() => expect(screen.getByText('Next Trip')).toBeInTheDocument());
    expect(screen.getByText('Old Trip')).toBeInTheDocument();
    expect(screen.getByText('Upcoming trips')).toBeInTheDocument();
    expect(screen.getByText('Past trips')).toBeInTheDocument();
  });
});
