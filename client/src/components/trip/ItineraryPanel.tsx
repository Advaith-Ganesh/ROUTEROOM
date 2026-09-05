import { useMemo } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { useActivities, useDeleteActivity, useItineraryAnalysis, useReorderActivities } from '../../hooks/useActivities';
import { usePlaces } from '../../hooks/usePlaces';
import { AddActivityForm } from './AddActivityForm';
import { DayColumn } from './DayColumn';
import type { TripRole } from '../../api/types';

export function ItineraryPanel({
  tripId,
  role,
  startDate,
  endDate,
}: {
  tripId: string;
  role: TripRole;
  startDate: string;
  endDate: string;
}) {
  const { data: activities, isLoading } = useActivities(tripId);
  const { data: analysis } = useItineraryAnalysis(tripId);
  const { data: places } = usePlaces(tripId);
  const deleteActivity = useDeleteActivity(tripId);
  const reorder = useReorderActivities(tripId);
  const canEdit = role === 'OWNER' || role === 'EDITOR';

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const byDate = useMemo(() => {
    const map = new Map<string, typeof activities>();
    for (const activity of activities ?? []) {
      const key = activity.date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(activity);
    }
    return map;
  }, [activities]);

  function handleDragEnd(event: DragEndEvent, dateKey: string) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const dayActivities = byDate.get(dateKey) ?? [];
    const oldIndex = dayActivities.findIndex((a) => a.id === active.id);
    const newIndex = dayActivities.findIndex((a) => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...dayActivities];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    reorder.mutate(reordered.map((a, index) => ({ id: a.id, orderIndex: index })));
  }

  if (isLoading) {
    return <p className="text-sm text-ink-500">Loading itinerary...</p>;
  }

  const analysisByDate = new Map((analysis ?? []).map((d) => [d.date, d]));
  const sortedDates = [...byDate.keys()].sort();

  return (
    <div className="space-y-6">
      {canEdit && (
        <AddActivityForm tripId={tripId} places={places ?? []} minDate={startDate.slice(0, 10)} maxDate={endDate.slice(0, 10)} />
      )}

      {sortedDates.length === 0 && (
        <p className="rounded-md border border-dashed border-ink-100 p-6 text-center text-sm text-ink-500">
          No activities scheduled yet.
        </p>
      )}

      {sortedDates.map((dateKey) => (
        <DndContext key={dateKey} sensors={sensors} onDragEnd={(e) => handleDragEnd(e, dateKey)}>
          <DayColumn
            date={dateKey}
            activities={byDate.get(dateKey) ?? []}
            analysis={analysisByDate.get(dateKey)}
            canEdit={canEdit}
            onDelete={(id) => deleteActivity.mutate(id)}
          />
        </DndContext>
      ))}
    </div>
  );
}
