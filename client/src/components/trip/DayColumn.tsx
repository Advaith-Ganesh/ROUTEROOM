import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Activity, DayAnalysis } from '../../api/types';
import { ActivityRow } from './ActivityRow';
import { formatDay, formatDuration } from '../../utils/format';

const warningStyles: Record<DayAnalysis['warnings'][number]['type'], string> = {
  OUT_OF_RANGE: 'border-red-200 bg-red-50 text-red-700',
  OVERLAP: 'border-red-200 bg-red-50 text-red-700',
  TRAVEL_CONFLICT: 'border-amber-200 bg-amber-50 text-amber-800',
  PACKED_DAY: 'border-amber-200 bg-amber-50 text-amber-800',
};

export function DayColumn({
  date,
  activities,
  analysis,
  canEdit,
  onDelete,
}: {
  date: string;
  activities: Activity[];
  analysis?: DayAnalysis;
  canEdit: boolean;
  onDelete: (activityId: string) => void;
}) {
  return (
    <div className="rounded-xl border border-ink-100 bg-ink-100/30 p-4">
      <div className="flex items-baseline justify-between">
        <h4 className="font-medium text-ink-900">{formatDay(date)}</h4>
        <span className="text-xs text-ink-500">
          {activities.length} activit{activities.length === 1 ? 'y' : 'ies'}
          {analysis && analysis.totalTravelMinutes > 0 && (
            <> · {formatDuration(analysis.totalTravelMinutes)} travel</>
          )}
        </span>
      </div>

      {analysis?.warnings.map((warning, i) => (
        <p key={i} className={`mt-2 rounded-md border px-3 py-1.5 text-xs ${warningStyles[warning.type]}`}>
          ⚠️ {warning.message}
        </p>
      ))}

      <SortableContext items={activities.map((a) => a.id)} strategy={verticalListSortingStrategy}>
        <div className="mt-3 space-y-2">
          {activities.map((activity) => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              canEdit={canEdit}
              onDelete={() => onDelete(activity.id)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
