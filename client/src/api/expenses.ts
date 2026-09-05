import { api } from './client';
import type { Balance, Expense, Settlement } from './types';

export interface ExpenseInput {
  description: string;
  amountCents: number;
  currency?: string;
  paidByUserId: string;
  participants: { userId: string; shareCents?: number }[];
}

export const expensesApi = {
  list: (tripId: string) =>
    api.get<{ expenses: Expense[]; balances: Balance[]; settlements: Settlement[] }>(
      `/trips/${tripId}/expenses`,
    ),
  create: (tripId: string, input: ExpenseInput) =>
    api.post<{ expense: Expense }>(`/trips/${tripId}/expenses`, input),
  remove: (expenseId: string) => api.delete<void>(`/expenses/${expenseId}`),
};
