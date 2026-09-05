import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { expensesApi, type ExpenseInput } from '../api/expenses';

export function useExpenses(tripId: string) {
  return useQuery({
    queryKey: ['trips', tripId, 'expenses'],
    queryFn: () => expensesApi.list(tripId),
  });
}

export function useCreateExpense(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseInput) => expensesApi.create(tripId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'expenses'] }),
  });
}

export function useDeleteExpense(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expenseId: string) => expensesApi.remove(expenseId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'expenses'] }),
  });
}
