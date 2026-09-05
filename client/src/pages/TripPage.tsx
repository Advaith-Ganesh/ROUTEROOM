import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTrip } from '../hooks/useTrip';
import { usePlaces } from '../hooks/usePlaces';
import { useActivities } from '../hooks/useActivities';
import { useRealtime } from '../hooks/useRealtime';
import { useAuth } from '../context/AuthContext';
import { TripHeader } from '../components/trip/TripHeader';
import { MapView } from '../components/trip/MapView';
import { PlacesPanel } from '../components/trip/PlacesPanel';
import { ItineraryPanel } from '../components/trip/ItineraryPanel';
import { WeatherPanel } from '../components/trip/WeatherPanel';
import { ExpensesPanel } from '../components/trip/ExpensesPanel';
import { MembersPanel } from '../components/trip/MembersPanel';

const TABS = ['Overview', 'Itinerary', 'Expenses', 'Collaborators'] as const;
type Tab = (typeof TABS)[number];

export function TripPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('Overview');

  const { data, isLoading, isError } = useTrip(tripId ?? '');
  const { data: places } = usePlaces(tripId ?? '');
  const { data: activities } = useActivities(tripId ?? '');
  useRealtime(tripId ?? '');

  if (isLoading) return <p className="text-sm text-ink-500">Loading trip...</p>;
  if (isError || !data) return <p className="text-sm text-red-600">This trip could not be found.</p>;

  const { trip, role } = data;

  return (
    <div className="space-y-6">
      <TripHeader trip={trip} role={role} />

      <div className="flex gap-1 border-b border-ink-100">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t ? 'border-brand-600 text-brand-600' : 'border-transparent text-ink-500 hover:text-ink-900'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <MapView
            destination={{ name: trip.destinationName, lat: trip.destinationLat, lon: trip.destinationLon }}
            places={places ?? []}
            activities={activities}
          />
          <div className="space-y-6">
            <WeatherPanel tripId={trip.id} />
            <PlacesPanel tripId={trip.id} role={role} />
          </div>
        </div>
      )}

      {tab === 'Itinerary' && (
        <ItineraryPanel tripId={trip.id} role={role} startDate={trip.startDate} endDate={trip.endDate} />
      )}

      {tab === 'Expenses' && user && (
        <ExpensesPanel tripId={trip.id} role={role} currentUserId={user.id} />
      )}

      {tab === 'Collaborators' && <MembersPanel tripId={trip.id} role={role} />}
    </div>
  );
}
