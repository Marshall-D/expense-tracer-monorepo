// packages/client/src/hooks/useReports.ts
import { useQuery, useMutation } from "@tanstack/react-query";
import * as reportService from "@/services";
import { keepPreviousData } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import type {
  TrendsResponse,
  MonthlyReportResponse,
  ByCategoryResponse,
} from "@/types/report";
import { t } from "@/lib/toast";

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
 *
 * This hook shows toast messages:
 * - loading toast when export starts
 * - success toast when server responded (download process can follow)
 * - error toast if export failed
 */
export const useExportExpenses = () =>
  useMutation<any, Error, { from: string; to: string }>({
    mutationFn: async (vars) => {
      const resp = await reportService.exportExpenses(vars.from, vars.to);
      return resp;
    },
    onMutate: () => {
      // show an ephemeral loading toast (we dismiss or replace later)
      t.loading("Preparing CSV…");
    },
    onSuccess: (data) => {
      // dismiss loading then show success
      t.dismiss();
      t.success("CSV ready — starting download");
      // note: actual file download is handled by the caller (component).
    },
    onError: (err: any) => {
      t.dismiss();
      const msg =
        (err && (err.response?.data?.message || err.message)) ||
        "Export failed";
      t.error(msg, { duration: 7000 });
    },
  });
