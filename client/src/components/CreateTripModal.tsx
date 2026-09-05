import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { PlaceSearchInput } from './PlaceSearchInput';
import { useCreateTrip } from '../hooks/useTrips';
import { ApiError } from '../api/client';
import type { PlaceSearchResult } from '../api/types';

export function CreateTripModal({ onClose }: { onClose: () => void }) {
  const createTrip = useCreateTrip();
  const [name, setName] = useState('');
  const [destination, setDestination] = useState<PlaceSearchResult | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!destination) {
      setError('Search for a destination and select it from the list.');
      return;
    }
    try {
      await createTrip.mutateAsync({
        name,
        destinationName: destination.name,
        destinationLat: destination.lat,
        destinationLon: destination.lon,
        startDate,
        endDate,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the trip.');
    }
  }

  return (
    <Modal title="Create a trip" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink-700">Trip name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="London Summer Trip"
            className="mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700">Destination</label>
          <div className="mt-1">
            <PlaceSearchInput placeholder="Search for a city..." onSelect={setDestination} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-ink-700">Start date</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700">End date</label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={createTrip.isPending}
          className="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
        >
          {createTrip.isPending ? 'Creating...' : 'Create trip'}
        </button>
      </form>
    </Modal>
  );
}
