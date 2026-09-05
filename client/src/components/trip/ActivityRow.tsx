import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Activity } from '../../api/types';

export function ActivityRow({
  activity,
  canEdit,
  onDelete,
}: {
  activity: Activity;
  canEdit: boolean;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-md border border-ink-100 bg-white px-3 py-2"
    >
      {canEdit && (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-ink-300 hover:text-ink-500"
          aria-label="Drag to reorder"
        >
          ⠿
        </button>
      )}
      <div className="w-16 shrink-0 text-sm font-medium text-ink-700">
        {activity.startTime.slice(11, 16)}
        {activity.endTime && (
          <span className="block text-xs font-normal text-ink-500">{activity.endTime.slice(11, 16)}</span>
        )}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-ink-900">{activity.place.name}</p>
        <div className="flex gap-2 text-xs text-ink-500">
          {activity.category && <span>{activity.category}</span>}
          {activity.status !== 'PLANNED' && <span>{activity.status}</span>}
        </div>
        {activity.notes && <p className="mt-1 text-xs text-ink-500">{activity.notes}</p>}
      </div>
      {canEdit && (
        <button onClick={onDelete} className="text-xs text-ink-500 hover:text-red-600">
          Remove
        </button>
      )}
    </div>
  );
}
