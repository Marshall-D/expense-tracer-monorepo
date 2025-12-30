// packages/client/src/hooks/useReports.ts
import { useQuery, useMutation } from "@tanstack/react-query";
import * as reportService from "@/services/reportService";
import { keepPreviousData } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import type {
  TrendsResponse,
  MonthlyReportResponse,
  ByCategoryResponse,
} from "@/types/report";

/**
 * useTrends - fetch last N months trend
 * returns { months: [{ month: 'YYYY-MM', totalUSD, totalNGN }] }
 */
export const useTrends = (months = 6) =>
  useQuery<TrendsResponse>({
    queryKey: [queryKeys.reports, "trends", { months }],
    queryFn: () => reportService.fetchTrends(months),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 2,
  });

/**
 * useMonthlyReport - totals & top categories for a specific month
 */
export const useMonthlyReport = (year: number, month: number) =>
  useQuery<MonthlyReportResponse>({
    queryKey: [queryKeys.reports, "monthly", { year, month }],
    queryFn: () => reportService.fetchMonthlyReport(year, month),
    staleTime: 1000 * 60 * 5,
  });

/**
 * useCategoryReport - spending by category for a date range
 */
export const useCategoryReport = (from: string, to: string) =>
  useQuery<ByCategoryResponse>({
    queryKey: [queryKeys.reports, "byCategory", { from, to }],
    queryFn: () => reportService.fetchByCategory(from, to),
    staleTime: 1000 * 60 * 5,
  });

/**
 * useExportExpenses - mutation that triggers CSV download
 * Caller should provide from/to strings (ISO yyyy-mm-dd)
 */
export const useExportExpenses = () =>
  useMutation({
    mutationFn: async (vars: { from: string; to: string }) => {
      const resp = await reportService.exportExpenses(vars.from, vars.to);
      return resp;
    },
  });
