// packages/client/src/services/reportService.ts
import api from "@/lib/api";
import {
  ByCategoryResponse,
  MonthlyReportResponse,
  TrendsResponse,
} from "@/types/report";

/**
 * Thin wrappers for reporting endpoints.
 * - Query params are simple primitives (numbers/strings).
 */

export const fetchTrends = async (months = 6): Promise<TrendsResponse> => {
  const resp = await api.get<TrendsResponse>("/api/reports/trends", {
    params: { months },
  });
  // server returns { months: [...] }
  return resp.data as TrendsResponse;
};

export const fetchMonthlyReport = async (
  year: number,
  month: number
): Promise<MonthlyReportResponse> => {
  const resp = await api.get<MonthlyReportResponse>("/api/reports/monthly", {
    params: { year: String(year), month: String(month) },
  });
  return resp.data as MonthlyReportResponse;
};

export const fetchByCategory = async (
  from: string,
  to: string
): Promise<ByCategoryResponse> => {
  const resp = await api.get<ByCategoryResponse>("/api/reports/by-category", {
    params: { from, to },
  });
  return resp.data as ByCategoryResponse;
};

export const exportExpenses = async (from: string, to: string) => {
  // returns CSV blob response
  const resp = await api.get("/api/export/expenses", {
    params: { from, to, format: "csv" },
    responseType: "blob",
  });
  return resp;
};
