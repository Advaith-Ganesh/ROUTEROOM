import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Trip, TripRole } from '../../api/types';
import { formatDateRange } from '../../utils/format';
import { useUpdateTrip } from '../../hooks/useTrip';
import { useDeleteTrip, useDuplicateTrip } from '../../hooks/useTrips';

export function TripHeader({ trip, role }: { trip: Trip; role: TripRole }) {
  const navigate = useNavigate();
  const updateTrip = useUpdateTrip(trip.id);
  const deleteTrip = useDeleteTrip();
  const duplicateTrip = useDuplicateTrip();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(trip.name);
  const isOwner = role === 'OWNER';

  return (
    <div className="rounded-xl border border-ink-100 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {isEditing ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-ink-100 px-2 py-1 text-xl font-semibold"
            />
          ) : (
            <h1 className="text-2xl font-semibold text-ink-900">{trip.name}</h1>
          )}
          <p className="mt-1 text-sm text-ink-500">{trip.destinationName}</p>
          <p className="mt-1 text-xs text-ink-500">{formatDateRange(trip.startDate, trip.endDate)}</p>
        </div>
        {isOwner && (
          <div className="flex shrink-0 gap-2 text-sm">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    updateTrip.mutate({ name });
                    setIsEditing(false);
                  }}
                  className="rounded-md bg-brand-600 px-3 py-1.5 text-white hover:bg-brand-500"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="rounded-md border border-ink-100 px-3 py-1.5 text-ink-700"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="rounded-md border border-ink-100 px-3 py-1.5 text-ink-700 hover:bg-ink-100/60"
                >
                  Edit
                </button>
                <button
                  onClick={() => duplicateTrip.mutate(trip.id)}
                  className="rounded-md border border-ink-100 px-3 py-1.5 text-ink-700 hover:bg-ink-100/60"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${trip.name}"? This cannot be undone.`)) {
                      deleteTrip.mutate(trip.id, { onSuccess: () => navigate('/') });
                    }
                  }}
                  className="rounded-md border border-red-200 px-3 py-1.5 text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
