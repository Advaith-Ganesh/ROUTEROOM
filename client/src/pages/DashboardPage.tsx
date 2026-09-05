import { useMemo, useState } from 'react';
import { useTrips } from '../hooks/useTrips';
import { TripCard } from '../components/TripCard';
import { CreateTripModal } from '../components/CreateTripModal';

export function DashboardPage() {
  const { data: trips, isLoading, isError } = useTrips();
  const [isCreating, setIsCreating] = useState(false);

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const list = trips ?? [];
    return {
      upcoming: list.filter((t) => new Date(t.endDate) >= now),
      past: list.filter((t) => new Date(t.endDate) < now),
    };
  }, [trips]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">My Trips</h1>
          <p className="mt-1 text-sm text-ink-500">Plan, organise, and share your itineraries.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
        >
          + New trip
        </button>
      </div>

      {isLoading && <p className="mt-8 text-sm text-ink-500">Loading your trips...</p>}
      {isError && <p className="mt-8 text-sm text-red-600">Couldn't load your trips. Please try again.</p>}

      {!isLoading && trips && trips.length === 0 && (
        <div className="mt-12 rounded-xl border border-dashed border-ink-100 bg-white p-12 text-center">
          <p className="text-ink-700">No trips yet</p>
          <button
            onClick={() => setIsCreating(true)}
            className="mt-2 font-medium text-brand-600 hover:underline"
          >
            Create your first trip →
          </button>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-ink-500">Upcoming trips</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-medium uppercase tracking-wide text-ink-500">Past trips</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </section>
      )}

      {isCreating && <CreateTripModal onClose={() => setIsCreating(false)} />}
    </div>
  );
}
