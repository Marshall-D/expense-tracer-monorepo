// packages/client/src/hooks/useExpenses.ts
import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import * as expensesService from "@/services";
import { queryKeys } from "@/lib/queryKeys";
import type {
  ExpenseCreatePayload,
  ExpensesListResponse,
  Expense,
} from "@/types/expense";
import { t } from "@/lib/toast";

/**
 * useExpenses - fetch paginated expenses list
 * params corresponds to query params supported by the backend (from, to, category, limit, page, q)
 */
export const useExpenses = (params?: Record<string, any>) =>
  useQuery<ExpensesListResponse, Error>({
    queryKey: [queryKeys.expenses, params ?? {}],
    queryFn: () => expensesService.fetchExpenses(params),
    // keepPreviousData helps smooth pagination transitions
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  });

/**
 * useExpense - fetch a single expense by id
 */
export const useExpense = (id?: string) =>
  useQuery<Expense>({
    queryKey: id ? [queryKeys.expense, id] : [queryKeys.expense, "empty"],
    enabled: Boolean(id),
    queryFn: ({ queryKey }) => {
      const maybeId = queryKey[1] as string | undefined;
      if (!maybeId) return Promise.reject(new Error("Missing id"));
      return expensesService.getExpense(maybeId);
    },
    staleTime: 1000 * 30,
  });

/**
 * useCreateExpense - mutation with optimistic update for list cache
 */
type CreateContext = {
  previous?: ExpensesListResponse | undefined;
  optimisticId?: string;
};

export const useCreateExpense = () => {
  const qc = useQueryClient();

  return useMutation<
    { id: string }, // result
    Error,
    ExpenseCreatePayload, // variables
    CreateContext
  >({
    mutationFn: (payload) => expensesService.createExpense(payload),

    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: [queryKeys.expenses] });

      const previous = qc.getQueryData<ExpensesListResponse | undefined>([
        queryKeys.expenses,
      ]);

      const optimisticItem: Expense = {
        id: `tmp-${Date.now()}`,
        userId: null,
        amount: payload.amount,
        currency: payload.currency ?? "NGN",
        description: payload.description ?? "",
        category: (payload as any).category ?? "Uncategorized",
        categoryId: (payload as any).categoryId ?? null,
        date: payload.date ?? new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      if (previous) {
        qc.setQueryData<ExpensesListResponse>([queryKeys.expenses], {
          ...previous,
          total: previous.total + 1,
          data: [optimisticItem, ...previous.data],
        });
      } else {
        qc.setQueryData<ExpensesListResponse>([queryKeys.expenses], {
          total: 1,
          page: 1,
          limit: 20,
          data: [optimisticItem],
        });
      }

      return { previous, optimisticId: optimisticItem.id };
    },

    onError: (err, variables, context) => {
      if (context?.previous) {
        qc.setQueryData([queryKeys.expenses], context.previous);
      }
      t.error(err?.message ?? "Failed to add expense");
    },

    onSuccess: (data, variables, context) => {
      // server returned id; invalidate to sync and show success toast
      qc.invalidateQueries({ queryKey: [queryKeys.expenses] });
      t.success("Expense added");
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.expenses] });
      qc.invalidateQueries({ queryKey: [queryKeys.budgets] });
      qc.invalidateQueries({ queryKey: [queryKeys.reports] });
    },
  });
};

/**
 * useUpdateExpense - updates a single expense with optimistic update
 * variables: { id, payload }
 */
type UpdateVars = { id: string; payload: ExpenseCreatePayload };
type UpdateContext = {
  previous?: ExpensesListResponse | undefined;
  previousItem?: Expense | undefined;
};

export const useUpdateExpense = () => {
  const qc = useQueryClient();

  return useMutation<void, Error, UpdateVars, UpdateContext>({
    mutationFn: ({ id, payload }) => expensesService.updateExpense(id, payload),

    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: [queryKeys.expenses] });

      const previous = qc.getQueryData<ExpensesListResponse | undefined>([
        queryKeys.expenses,
      ]);

      // Capture previous single item if present
      const previousItem = previous?.data.find((d) => d.id === id);

      if (previous) {
        const newData = {
          ...previous,
          data: previous.data.map((d) =>
            d.id === id
              ? {
                  ...d,
                  amount: payload.amount ?? d.amount,
                  currency: payload.currency ?? d.currency,
                  description: payload.description ?? d.description,
                  categoryId: payload.categoryId ?? d.categoryId,
                  date: payload.date ?? d.date,
                }
              : d
          ),
        };
        qc.setQueryData([queryKeys.expenses], newData);
      }

      // also update single expense cache if present
      const singleKey = [queryKeys.expense, id];
      const prevSingle = qc.getQueryData<Expense | undefined>(singleKey);
      if (prevSingle) {
        qc.setQueryData<Expense>(singleKey, {
          ...prevSingle,
          amount: payload.amount ?? prevSingle.amount,
          currency: payload.currency ?? prevSingle.currency,
          description: payload.description ?? prevSingle.description,
          categoryId: payload.categoryId ?? prevSingle.categoryId,
          date: payload.date ?? prevSingle.date,
        });
      }

      return { previous, previousItem };
    },

    onError: (err, vars, context) => {
      if (context?.previous) {
        qc.setQueryData([queryKeys.expenses], context.previous);
      }
      // If we captured a previous single item, restore it too
      if (context?.previousItem) {
        qc.setQueryData([queryKeys.expense, vars.id], context.previousItem);
      }
      t.error(err?.message ?? "Failed to update expense");
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.expenses] });
      qc.invalidateQueries({ queryKey: [queryKeys.expense] });
      t.success("Expense updated");
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.expenses] });
      qc.invalidateQueries({ queryKey: [queryKeys.expense] });
      qc.invalidateQueries({ queryKey: [queryKeys.budgets] });
      qc.invalidateQueries({ queryKey: [queryKeys.reports] });
    },
  });
};

/**
 * useDeleteExpense - deletes expense with optimistic removal
 */
export const useDeleteExpense = () => {
  const qc = useQueryClient();

  return useMutation<
    void,
    Error,
    string,
    { previous?: ExpensesListResponse | undefined }
  >({
    mutationFn: (id) => expensesService.deleteExpense(id),

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: [queryKeys.expenses] });

      const previous = qc.getQueryData<ExpensesListResponse | undefined>([
        queryKeys.expenses,
      ]);

      if (previous) {
        qc.setQueryData<ExpensesListResponse>([queryKeys.expenses], {
          ...previous,
          total: Math.max(0, previous.total - 1),
          data: previous.data.filter((d) => d.id !== id),
        });
      }

      // remove single expense cache too
      qc.removeQueries({ queryKey: [queryKeys.expense, id] });

      return { previous };
    },

    onError: (err, id, context) => {
      if (context?.previous) {
        qc.setQueryData([queryKeys.expenses], context.previous);
      }
      t.error(err?.message ?? "Failed to delete expense");
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.expenses] });
      t.success("Expense deleted");
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.expenses] });
      qc.invalidateQueries({ queryKey: [queryKeys.budgets] });
      qc.invalidateQueries({ queryKey: [queryKeys.reports] });
    },
  });
};
