import { useState, type FormEvent } from 'react';
import { useCreateActivity } from '../../hooks/useActivities';
import { ApiError } from '../../api/client';
import type { Place } from '../../api/types';

export function AddActivityForm({
  tripId,
  places,
  minDate,
  maxDate,
  onCreated,
}: {
  tripId: string;
  places: Place[];
  minDate: string;
  maxDate: string;
  onCreated?: () => void;
}) {
  const createActivity = useCreateActivity(tripId);
  const [placeId, setPlaceId] = useState('');
  const [date, setDate] = useState(minDate);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!placeId) {
      setError('Choose a saved place first.');
      return;
    }
    try {
      await createActivity.mutateAsync({
        placeId,
        date,
        startTime,
        endTime: endTime || null,
        category: category || undefined,
      });
      setEndTime('');
      setCategory('');
      onCreated?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add this activity.');
    }
  }

  if (places.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-ink-100 p-4 text-sm text-ink-500">
        Save a place first (see the Places panel), then come back here to add it to the itinerary.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 rounded-md border border-ink-100 p-4 sm:grid-cols-6">
      <select
        value={placeId}
        onChange={(e) => setPlaceId(e.target.value)}
        className="col-span-2 rounded-md border border-ink-100 px-2 py-1.5 text-sm sm:col-span-2"
      >
        <option value="">Select place...</option>
        {places.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={date}
        min={minDate}
        max={maxDate}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-md border border-ink-100 px-2 py-1.5 text-sm"
      />
      <input
        type="time"
        value={startTime}
        onChange={(e) => setStartTime(e.target.value)}
        className="rounded-md border border-ink-100 px-2 py-1.5 text-sm"
      />
      <input
        type="time"
        value={endTime}
        onChange={(e) => setEndTime(e.target.value)}
        placeholder="End (optional)"
        className="rounded-md border border-ink-100 px-2 py-1.5 text-sm"
      />
      <input
        type="text"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Category"
        className="rounded-md border border-ink-100 px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={createActivity.isPending}
        className="col-span-2 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60 sm:col-span-1"
      >
        Add
      </button>
      {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
