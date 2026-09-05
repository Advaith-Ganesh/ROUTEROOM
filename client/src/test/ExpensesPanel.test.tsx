import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './utils';
import { ExpensesPanel } from '../components/trip/ExpensesPanel';

const members = [
  { id: 'm1', tripId: 't1', userId: 'alice', role: 'OWNER' as const, user: { id: 'alice', name: 'Alice', email: 'a@x.com' } },
  { id: 'm2', tripId: 't1', userId: 'bob', role: 'EDITOR' as const, user: { id: 'bob', name: 'Bob', email: 'b@x.com' } },
];

const listExpensesMock = vi.fn(async (..._args: unknown[]) => ({
  expenses: [
    {
      id: 'e1',
      tripId: 't1',
      description: 'Dinner',
      amountCents: 9000,
      currency: 'GBP',
      paidByUserId: 'alice',
      paidBy: { id: 'alice', name: 'Alice' },
      participants: [
        { id: 'p1', userId: 'alice', shareCents: 4500, user: { id: 'alice', name: 'Alice' } },
        { id: 'p2', userId: 'bob', shareCents: 4500, user: { id: 'bob', name: 'Bob' } },
      ],
      createdAt: new Date().toISOString(),
    },
  ],
  balances: [
    { userId: 'alice', name: 'Alice', netCents: 4500 },
    { userId: 'bob', name: 'Bob', netCents: -4500 },
  ],
  settlements: [{ fromUserId: 'bob', fromName: 'Bob', toUserId: 'alice', toName: 'Alice', amountCents: 4500 }],
}));

const createExpenseMock = vi.fn(async (..._args: unknown[]) => ({ expense: {} }));

vi.mock('../api/expenses', () => ({
  expensesApi: {
    list: (...args: unknown[]) => listExpensesMock(...args),
    create: (...args: unknown[]) => createExpenseMock(...args),
    remove: vi.fn(),
  },
}));

vi.mock('../api/members', () => ({
  membersApi: {
    list: vi.fn(async () => ({ members })),
  },
}));

describe('ExpensesPanel', () => {
  it('renders the computed settle-up balance', async () => {
    renderWithProviders(<ExpensesPanel tripId="t1" role="OWNER" currentUserId="alice" />);

    expect(await screen.findByText(/Bob owes Alice £45\.00/)).toBeInTheDocument();
    expect(screen.getByText('Dinner')).toBeInTheDocument();
    expect(screen.getByText(/£90\.00 paid by Alice/)).toBeInTheDocument();
  });

  it('rejects submitting an expense with no participants selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExpensesPanel tripId="t1" role="OWNER" currentUserId="alice" />);

    await waitFor(() => expect(screen.getByPlaceholderText('Description')).toBeInTheDocument());
    await user.type(screen.getByPlaceholderText('Description'), 'Broken expense');
    await user.type(screen.getByPlaceholderText('Amount'), '10');
    await user.click(screen.getByRole('checkbox', { name: 'Alice' })); // uncheck the only pre-selected participant
    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    expect(await screen.findByText(/select at least one participant/i)).toBeInTheDocument();
    expect(createExpenseMock).not.toHaveBeenCalled();
  });
});
