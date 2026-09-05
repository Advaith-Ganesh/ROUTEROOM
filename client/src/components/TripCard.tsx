import { Link } from 'react-router-dom';
import type { TripSummary } from '../api/types';
import { formatDateRange } from '../utils/format';

const roleBadgeStyles: Record<TripSummary['role'], string> = {
  OWNER: 'bg-brand-100 text-brand-600',
  EDITOR: 'bg-ink-100 text-ink-700',
  VIEWER: 'bg-ink-100 text-ink-500',
};

export function TripCard({ trip }: { trip: TripSummary }) {
  return (
    <Link
      to={`/trips/${trip.id}`}
      className="block rounded-xl border border-ink-100 bg-white p-5 shadow-sm transition hover:border-brand-500 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-ink-900">{trip.name}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeStyles[trip.role]}`}>
          {trip.role}
        </span>
      </div>
      <p className="mt-1 text-sm text-ink-500">{trip.destinationName}</p>
      <p className="mt-3 text-xs text-ink-500">{formatDateRange(trip.startDate, trip.endDate)}</p>
      <div className="mt-4 flex gap-4 text-xs text-ink-500">
        <span>{trip.activityCount} activities</span>
        <span>{trip.memberCount} member{trip.memberCount === 1 ? '' : 's'}</span>
      </div>
    </Link>
  );
}
