// packages/client/src/services/budgetService.ts
import api from "@/lib/api";
import type { Budget } from "@/types/budget";

/**
 * Budget payloads
 */
export type BudgetCreatePayload = {
  categoryId?: string | null; // optional: can be null for uncategorized
  category?: string | null; // fallback name
  periodStart: string; // ISO date string (will be normalized server-side)
  amount: number;
};

export type BudgetUpdatePayload = Partial<{
  categoryId: string | null;
  category: string;
  periodStart: string;
  amount: number;
}>;

/**
 * Fetch list of budgets
 * Query params supported: periodStart (ISO string), categoryId
 */
export const fetchBudgets = async (params?: {
  periodStart?: string;
  categoryId?: string;
}) => {
  const resp = await api.get<{ data: Budget[] }>("/api/budgets", {
    params,
  });
  return resp.data?.data ?? [];
};

/**
 * Get single budget by id
 */
export const getBudget = async (id: string) => {
  const resp = await api.get<{ data: Budget }>(`/api/budgets/${id}`);
  return resp.data?.data;
};

/**
 * Create budget
 * Server returns { id: insertedId } (201)
 */
export const createBudget = async (payload: BudgetCreatePayload) => {
  const resp = await api.post("/api/budgets", payload);
  return resp.data; // caller can inspect id if needed
};

/**
 * Update budget
 * Server returns { data: { ...updatedBudget } }
 */
export const updateBudget = async (
  id: string,
  payload: BudgetUpdatePayload
) => {
  const resp = await api.put(`/api/budgets/${id}`, payload);
  // response shape may be { data: { ... } }
  return resp.data?.data ?? resp.data;
};

/**
 * Delete budget
 */
export const deleteBudget = async (id: string) => {
  const resp = await api.delete(`/api/budgets/${id}`);
  return resp.data;
};
