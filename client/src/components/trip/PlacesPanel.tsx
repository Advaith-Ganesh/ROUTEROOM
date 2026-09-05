import { usePlaces, useSavePlace, useDeletePlace } from '../../hooks/usePlaces';
import { PlaceSearchInput } from '../PlaceSearchInput';
import type { TripRole } from '../../api/types';
import { ApiError } from '../../api/client';
import { useState } from 'react';

export function PlacesPanel({ tripId, role }: { tripId: string; role: TripRole }) {
  const { data: places, isLoading } = usePlaces(tripId);
  const savePlace = useSavePlace(tripId);
  const deletePlace = useDeletePlace(tripId);
  const [error, setError] = useState<string | null>(null);
  const canEdit = role === 'OWNER' || role === 'EDITOR';

  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5">
      <h3 className="font-semibold text-ink-900">Saved places</h3>
      {canEdit && (
        <div className="mt-3">
          <PlaceSearchInput
            placeholder="Search for a place to add..."
            onSelect={async (result) => {
              setError(null);
              try {
                await savePlace.mutateAsync(result);
              } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Could not save this place.');
              }
            }}
          />
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {isLoading && <p className="mt-3 text-sm text-ink-500">Loading places...</p>}
      <ul className="mt-4 space-y-2">
        {places?.map((place) => (
          <li
            key={place.id}
            className="flex items-center justify-between rounded-md border border-ink-100 px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium text-ink-900">{place.name}</p>
              {place.address && <p className="text-xs text-ink-500">{place.address}</p>}
            </div>
            {canEdit && (
              <button
                onClick={() => deletePlace.mutate(place.id)}
                className="text-xs text-ink-500 hover:text-red-600"
              >
                Remove
              </button>
            )}
          </li>
        ))}
        {places?.length === 0 && <p className="text-sm text-ink-500">No places saved yet.</p>}
      </ul>
    </div>
  );
}
