import { useState, type FormEvent } from 'react';
import { useExpenses, useCreateExpense, useDeleteExpense } from '../../hooks/useExpenses';
import { useMembers } from '../../hooks/useMembers';
import { ApiError } from '../../api/client';
import { formatMoney } from '../../utils/format';
import type { TripRole } from '../../api/types';

export function ExpensesPanel({ tripId, role, currentUserId }: { tripId: string; role: TripRole; currentUserId: string }) {
  const { data, isLoading } = useExpenses(tripId);
  const { data: members } = useMembers(tripId);
  const createExpense = useCreateExpense(tripId);
  const deleteExpense = useDeleteExpense(tripId);
  const canEdit = role === 'OWNER' || role === 'EDITOR';

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidByUserId, setPaidByUserId] = useState(currentUserId);
  const [participantIds, setParticipantIds] = useState<string[]>([currentUserId]);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const amountCents = Math.round(Number.parseFloat(amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }
    if (participantIds.length === 0) {
      setError('Select at least one participant.');
      return;
    }
    try {
      await createExpense.mutateAsync({
        description,
        amountCents,
        paidByUserId,
        participants: participantIds.map((userId) => ({ userId })),
      });
      setDescription('');
      setAmount('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add this expense.');
    }
  }

  function toggleParticipant(userId: string) {
    setParticipantIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5">
      <h3 className="font-semibold text-ink-900">Expenses</h3>

      {canEdit && members && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3 rounded-md border border-ink-100 p-4">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              required
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-md border border-ink-100 px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-md border border-ink-100 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-700">Paid by</label>
            <select
              value={paidByUserId}
              onChange={(e) => setPaidByUserId(e.target.value)}
              className="mt-1 w-full rounded-md border border-ink-100 px-2 py-1.5 text-sm"
            >
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-700">Split equally between</label>
            <div className="mt-1 flex flex-wrap gap-3">
              {members.map((m) => (
                <label key={m.userId} className="flex items-center gap-1.5 text-sm text-ink-700">
                  <input
                    type="checkbox"
                    checked={participantIds.includes(m.userId)}
                    onChange={() => toggleParticipant(m.userId)}
                  />
                  {m.user.name}
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={createExpense.isPending}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
          >
            Add expense
          </button>
        </form>
      )}

      {isLoading && <p className="mt-3 text-sm text-ink-500">Loading expenses...</p>}

      {data && data.settlements.length > 0 && (
        <div className="mt-4 rounded-md bg-brand-100/60 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-600">Who owes whom</p>
          <ul className="mt-1 space-y-1 text-sm text-ink-900">
            {data.settlements.map((s, i) => (
              <li key={i}>
                {s.fromName} owes {s.toName} {formatMoney(s.amountCents)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {data?.expenses.map((expense) => (
          <li key={expense.id} className="rounded-md border border-ink-100 px-3 py-2 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink-900">{expense.description}</p>
                <p className="text-xs text-ink-500">
                  {formatMoney(expense.amountCents, expense.currency)} paid by {expense.paidBy.name}
                </p>
              </div>
              {canEdit && (
                <button
                  onClick={() => deleteExpense.mutate(expense.id)}
                  className="text-xs text-ink-500 hover:text-red-600"
                >
                  Remove
                </button>
              )}
            </div>
          </li>
        ))}
        {data?.expenses.length === 0 && <p className="text-sm text-ink-500">No expenses logged yet.</p>}
      </ul>
    </div>
  );
}
