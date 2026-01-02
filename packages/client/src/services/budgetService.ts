// packages/client/src/services/budgetService.ts

import api from "@/lib/api";
import type {
  Budget,
  BudgetCreatePayload,
  BudgetUpdatePayload,
} from "@/types/budget";

/**
 * Fetch list of budgets
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

export const getBudget = async (id: string) => {
  const resp = await api.get<{ data: Budget }>(`/api/budgets/${id}`);
  return resp.data?.data;
};

export const createBudget = async (payload: BudgetCreatePayload) => {
  try {
    const resp = await api.post("/api/budgets", payload);
    return resp.data;
  } catch (err: any) {
    const status = err?.response?.status;
    const serverCode = err?.response?.data?.error;
    const serverMessage = err?.response?.data?.message;

    if (status === 409 && serverCode === "budget_exists") {
      throw new Error(
        "A budget for that category already exists. Edit the existing budget."
      );
    }

    if (serverMessage) throw new Error(serverMessage);
    throw err;
  }
};

export const updateBudget = async (
  id: string,
  payload: BudgetUpdatePayload
) => {
  try {
    const resp = await api.put(`/api/budgets/${id}`, payload);
    return resp.data?.data ?? resp.data;
  } catch (err: any) {
    const status = err?.response?.status;
    const serverCode = err?.response?.data?.error;
    const serverMessage = err?.response?.data?.message;

    if (status === 409 && serverCode === "budget_exists") {
      throw new Error(
        "A budget for that category already exists. Edit the existing budget."
      );
    }

    if (serverMessage) throw new Error(serverMessage);
    throw err;
  }
};

export const deleteBudget = async (id: string) => {
  const resp = await api.delete(`/api/budgets/${id}`);
  return resp.data;
};
