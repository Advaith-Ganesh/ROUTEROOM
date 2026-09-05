import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './utils';
import { ItineraryPanel } from '../components/trip/ItineraryPanel';

const place = {
  id: 'place-1',
  tripId: 'trip-1',
  externalId: 'ext-1',
  name: 'Louvre',
  address: 'Paris',
  category: 'museum',
  lat: 48.86,
  lon: 2.34,
  source: 'nominatim',
};

const activity = {
  id: 'activity-1',
  tripId: 'trip-1',
  placeId: 'place-1',
  place,
  date: '2027-06-10T00:00:00.000Z',
  startTime: '2027-06-10T10:00:00.000Z',
  endTime: '2027-06-10T12:00:00.000Z',
  notes: null,
  category: 'Museum',
  status: 'PLANNED' as const,
  orderIndex: 0,
};

const listActivitiesMock = vi.fn(async (..._args: unknown[]) => ({ activities: [activity] }));
const analysisMock = vi.fn(async (..._args: unknown[]) => ({
  days: [
    {
      date: '2027-06-10',
      activityCount: 1,
      totalTravelMinutes: 0,
      isPacked: false,
      travelSegments: [],
      warnings: [{ type: 'PACKED_DAY' as const, message: 'This day is very busy.', activityIds: ['activity-1'] }],
    },
  ],
}));
const createActivityMock = vi.fn(async (..._args: unknown[]) => ({ activity }));

vi.mock('../api/activities', () => ({
  activitiesApi: {
    list: (...args: unknown[]) => listActivitiesMock(...args),
    analysis: (...args: unknown[]) => analysisMock(...args),
    create: (...args: unknown[]) => createActivityMock(...args),
    update: vi.fn(),
    remove: vi.fn(),
    reorder: vi.fn(),
  },
}));

vi.mock('../api/places', () => ({
  placesApi: {
    list: vi.fn(async () => ({ places: [place] })),
  },
}));

describe('ItineraryPanel', () => {
  it('groups activities by day and surfaces scheduling warnings', async () => {
    renderWithProviders(
      <ItineraryPanel tripId="trip-1" role="OWNER" startDate="2027-06-10" endDate="2027-06-14" />,
    );

    expect(await screen.findByText('Louvre', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText(/10:00/)).toBeInTheDocument();
    expect(screen.getByText(/This day is very busy\./)).toBeInTheDocument();
  });

  it('lets an editor add a new activity from a saved place', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ItineraryPanel tripId="trip-1" role="EDITOR" startDate="2027-06-10" endDate="2027-06-14" />,
    );

    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument());
    await user.selectOptions(screen.getByRole('combobox'), 'place-1');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(createActivityMock).toHaveBeenCalledTimes(1));
    expect(createActivityMock.mock.calls[0]?.[1]).toMatchObject({ placeId: 'place-1' });
  });

  it('shows read-only itinerary for a VIEWER (no add form, no remove buttons)', async () => {
    renderWithProviders(
      <ItineraryPanel tripId="trip-1" role="VIEWER" startDate="2027-06-10" endDate="2027-06-14" />,
    );

    expect(await screen.findByText('Louvre', { selector: 'p' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByText('Remove')).not.toBeInTheDocument();
  });
});
