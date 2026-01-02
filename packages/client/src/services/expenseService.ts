// packages/client/src/services/expenseService.ts
import { api } from "@/lib";
import {
  Expense,
  ExpenseCreatePayload,
  ExpensesListResponse,
} from "@/types/expense";

/**
 * Service functions for expenses (HTTP layer).
 * These are thin wrappers around the axios instance and return response.data.
 */

function unwrap<T>(resp: any): T {
  // If it's an axios response or similar with .data
  if (resp && typeof resp === "object") {
    // resp.data.data (double wrapped)
    if (resp.data && resp.data.data !== undefined) {
      return resp.data.data as T;
    }
    // resp.data (single wrapped)
    if (resp.data !== undefined) {
      return resp.data as T;
    }
  }
  // fallback: assume resp is already the payload
  return resp as T;
}
export const createExpense = async (payload: ExpenseCreatePayload) => {
  const resp = await api.post<{ id: string }>("/api/expenses", payload);
  return resp.data; // { id }
};

export const fetchExpenses = async (params?: {
  from?: string;
  to?: string;
  category?: string;
  categoryId?: string;
  limit?: number;
  page?: number;
  sort?: string;
}): Promise<ExpensesListResponse> => {
  const resp = await api.get<ExpensesListResponse>("/api/expenses", {
    params,
  });
  return resp.data;
};

export const getExpense = async (id: string): Promise<Expense> => {
  const resp = await api.get<Expense>(`/api/expenses/${id}`);
  return unwrap<Expense>(resp);
};

export const updateExpense = async (
  id: string,
  payload: ExpenseCreatePayload
) => {
  const resp = await api.put(`/api/expenses/${id}`, payload);
  return resp.data;
};

export const deleteExpense = async (id: string) => {
  const resp = await api.delete(`/api/expenses/${id}`);
  return resp.data;
};
