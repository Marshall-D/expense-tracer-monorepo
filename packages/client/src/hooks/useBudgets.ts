// packages/client/src/hooks/useBudgets.ts
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
} from "@tanstack/react-query";
import * as budgetService from "@/services/budgetService";
import { queryKeys } from "@/lib/queryKeys";
import type { Budget } from "@/types/budget";
import type {
  BudgetCreatePayload,
  BudgetUpdatePayload,
} from "@/services/budgetService";

/**
 * useBudgets - fetch list of budgets
 * params: { periodStart?: string, categoryId?: string }
 */
export const useBudgets = (params?: Record<string, any>) =>
  useQuery<Budget[]>({
    queryKey: [queryKeys.budgets, params ?? {}],
    queryFn: () => budgetService.fetchBudgets(params),
    staleTime: 1000 * 30,
  });

/**
 * useBudget - fetch single budget by id
 */
export const useBudget = (id?: string) =>
  useQuery<Budget>({
    queryKey: id ? [queryKeys.budget, id] : [queryKeys.budget, "empty"],
    enabled: Boolean(id),
    queryFn: ({ queryKey }) => {
      const maybeId = queryKey[1] as string | undefined;
      if (!maybeId) return Promise.reject(new Error("Missing id"));
      return budgetService.getBudget(maybeId);
    },
    staleTime: 1000 * 30,
  });

/**
 * useCreateBudget - create budget with optimistic update
 */
type CreateContext = { previous?: Budget[] | undefined; optimisticId?: string };

export const useCreateBudget = () => {
  const qc = useQueryClient();

  return useMutation<
    any, // result (server returns { id })
    Error,
    BudgetCreatePayload,
    CreateContext
  >({
    mutationFn: (payload) => budgetService.createBudget(payload),

    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: [queryKeys.budgets] });

      const previous = qc.getQueryData<Budget[] | undefined>([
        queryKeys.budgets,
      ]);

      // optimistic item (minimal)
      const optimisticItem: Budget = {
        id: `tmp-${Date.now()}`,
        categoryId: payload.categoryId ?? null,
        amount: payload.amount,
        // server provides category name; optimistic shows provided name if any
        // We'll store category in a cast-any spot (actual Budget type has no category? if exists server returns it)
        ...(payload.category ? { category: payload.category } : {}),
      } as any;

      if (previous) {
        qc.setQueryData<Budget[]>(
          [queryKeys.budgets],
          [optimisticItem, ...previous]
        );
      } else {
        qc.setQueryData<Budget[]>([queryKeys.budgets], [optimisticItem]);
      }

      return { previous, optimisticId: optimisticItem.id };
    },

    onError: (err, variables, context) => {
      if (context?.previous) {
        qc.setQueryData([queryKeys.budgets], context.previous);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.budgets] });
      qc.invalidateQueries({ queryKey: [queryKeys.reports] });
      qc.invalidateQueries({ queryKey: [queryKeys.expenses] });
    },
  });
};

/**
 * useUpdateBudget - updates a budget with optimistic update
 * variables: { id, payload }
 */
type UpdateVars = { id: string; payload: BudgetUpdatePayload };
type UpdateContext = {
  previous?: Budget[] | undefined;
  previousItem?: Budget | undefined;
};

export const useUpdateBudget = () => {
  const qc = useQueryClient();

  return useMutation<any, Error, UpdateVars, UpdateContext>({
    mutationFn: ({ id, payload }) => budgetService.updateBudget(id, payload),

    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: [queryKeys.budgets] });

      const previous = qc.getQueryData<Budget[] | undefined>([
        queryKeys.budgets,
      ]);

      const previousItem = previous?.find((b) => b.id === id);

      if (previous) {
        const newData = previous.map((b) =>
          b.id === id
            ? {
                ...b,
                amount: payload.amount ?? b.amount,
                categoryId:
                  payload.categoryId !== undefined
                    ? payload.categoryId
                    : b.categoryId,
                // category name may be updated server-side; optimistic keep existing or provided category name
                ...(payload.category ? { category: payload.category } : {}),
              }
            : b
        );
        qc.setQueryData<Budget[]>([queryKeys.budgets], newData);
      }

      // update single budget cache if present
      const singleKey = [queryKeys.budget, id];
      const prevSingle = qc.getQueryData<Budget | undefined>(singleKey);
      if (prevSingle) {
        qc.setQueryData<Budget>(singleKey, {
          ...prevSingle,
          amount: payload.amount ?? prevSingle.amount,
          categoryId:
            payload.categoryId !== undefined
              ? payload.categoryId
              : prevSingle.categoryId,
          ...(payload.category ? { category: payload.category } : {}),
        });
      }

      return { previous, previousItem };
    },

    onError: (err, vars, context) => {
      if (context?.previous) {
        qc.setQueryData([queryKeys.budgets], context.previous);
      }
      if (context?.previousItem) {
        qc.setQueryData([queryKeys.budget, vars.id], context.previousItem);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.budgets] });
      qc.invalidateQueries({ queryKey: [queryKeys.budget] });
      qc.invalidateQueries({ queryKey: [queryKeys.reports] });
      qc.invalidateQueries({ queryKey: [queryKeys.expenses] });
    },
  });
};

/**
 * useDeleteBudget - optimistic removal
 */
export const useDeleteBudget = () => {
  const qc = useQueryClient();

  return useMutation<void, Error, string, { previous?: Budget[] | undefined }>({
    mutationFn: (id) => budgetService.deleteBudget(id),

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: [queryKeys.budgets] });

      const previous = qc.getQueryData<Budget[] | undefined>([
        queryKeys.budgets,
      ]);

      if (previous) {
        qc.setQueryData<Budget[]>(
          [queryKeys.budgets],
          previous.filter((b) => b.id !== id)
        );
      }

      // remove single budget cache too
      qc.removeQueries({ queryKey: [queryKeys.budget, id] });

      return { previous };
    },

    onError: (err, id, context) => {
      if (context?.previous) {
        qc.setQueryData([queryKeys.budgets], context.previous);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.budgets] });
      qc.invalidateQueries({ queryKey: [queryKeys.reports] });
      qc.invalidateQueries({ queryKey: [queryKeys.expenses] });
    },
  });
};
