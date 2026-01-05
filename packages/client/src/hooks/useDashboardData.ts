/**
 * packages/client/src/hooks/useDashboardData.ts
 *
 * Encapsulates all data fetching and derived state for the Dashboard.
 * - returns derived metrics (monthly totals, percent changes, category data, transactions)
 
 */

import { useMemo, useEffect, useState } from "react";
import {
  useTrends,
  useCategoryReport,
  useExpenses,
  useCategories,
} from "@/hooks";
import { monthToRange } from "@/lib/date";
import { formatNGN, formatNGNWithDecimals } from "@/lib/number";
import type { DashboardData } from "@/types";

/** Helper: safe percent change */
function computePercentChange(
  newVal: number,
  oldVal: number | null | undefined
) {
  // not computable
  if (oldVal == null) return null;
  if (oldVal === 0) {
    if (newVal === 0) return 0;
    // business rule: previous 0 and now > 0 => show 100% increase (explicit choice)
    return 100;
  }
  return Math.round(((newVal - oldVal) / oldVal) * 10000) / 100;
}

export function useDashboardData(monthsAgo = 6): DashboardData {
  // trends for last N months (NGN totals)
  const { data: trendsData, isLoading: trendsLoading } = useTrends(monthsAgo);

  // list of months from trends (oldest -> newest)
  const availableMonths = useMemo(
    () => trendsData?.months?.map((m: any) => m.month) ?? [],
    [trendsData]
  );

  // fallback current month
  const now = new Date();
  const currentIsoMonth = `${now.getUTCFullYear()}-${String(
    now.getUTCMonth() + 1
  ).padStart(2, "0")}`;

  // selected month state (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // initialize selectedMonth to latest month once trends arrive
  useEffect(() => {
    if (selectedMonth) return;
    const latest =
      trendsData?.months && trendsData.months.length
        ? trendsData.months[trendsData.months.length - 1].month
        : currentIsoMonth;
    setSelectedMonth(latest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trendsData]);

  const selectorMonths = useMemo(
    () => (availableMonths.length ? availableMonths : [currentIsoMonth]),
    [availableMonths, currentIsoMonth]
  );

  // canonical month range for the selected month (used by category and expenses queries)
  const selMonth = selectedMonth ?? currentIsoMonth;
  const [monthStartStr, monthEndStr] = useMemo(
    () => monthToRange(selMonth),
    [selMonth]
  );

  // fetch category report for selected month (NGN only)
  const { data: categoryResp, isLoading: categoryLoading } = useCategoryReport(
    monthStartStr,
    monthEndStr
  );

  // categories (for color mapping)
  const { data: categoriesList } = useCategories(true);

  // map category name -> color for consistent legend colors
  const categoryNameToColor = useMemo(() => {
    const m = new Map<string, string>();
    (categoriesList || []).forEach((c: any) => {
      if (c?.name) m.set(c.name, c.color ?? "");
    });
    return m;
  }, [categoriesList]);

  // build pie data for categories (NGN)
  const categoryData = useMemo(() => {
    return (categoryResp?.byCategory ?? []).map((r: any, i: number) => {
      const total = r.totalNGN ?? 0;
      const color =
        categoryNameToColor.get(r.category) || `var(--chart-${(i % 8) + 1})`;
      return { name: r.category, value: total, color };
    });
  }, [categoryResp, categoryNameToColor]);

  // transactions for selected month (for count)
  const { data: expensesResp, isLoading: expensesLoading } = useExpenses({
    from: monthStartStr,
    to: monthEndStr,
    limit: 5000,
    page: 1,
  });

  // monthly bar chart data (NGN-only)
  const monthlyData = useMemo(() => {
    return (trendsData?.months ?? []).map((m: any) => ({
      month: m.month ? String(m.month) : String(m),
      // UI expects label elsewhere; we'll transform label in view when needed.
      amount: m.totalNGN ?? 0,
    }));
  }, [trendsData]);

  // summary numbers
  const totalLastNMonths = useMemo(
    () =>
      // sum last N months (but only months that exist)
      monthlyData
        .slice(Math.max(0, monthlyData.length - monthsAgo))
        .reduce((s, x) => s + (x.amount ?? 0), 0),
    [monthlyData, monthsAgo]
  );

  // previous N months sum (if there are enough months)
  const totalPrevNMonths = useMemo(() => {
    const n = Math.min(monthsAgo, monthlyData.length);
    if (monthlyData.length < 2 * n) return null; // not enough history
    const prevWindow = monthlyData.slice(
      Math.max(0, monthlyData.length - 2 * n),
      monthlyData.length - n
    );
    return prevWindow.reduce((s, x) => s + (x.amount ?? 0), 0);
  }, [monthlyData, monthsAgo]);

  const lastMonthAmount = useMemo(
    () => (monthlyData.length ? monthlyData[monthlyData.length - 1].amount : 0),
    [monthlyData]
  );
  const prevMonthAmount = useMemo(
    () =>
      monthlyData.length > 1 ? monthlyData[monthlyData.length - 2].amount : 0,
    [monthlyData]
  );

  // percent changes
  const totalPercentChange = useMemo(() => {
    // only compute when prev window is available
    if (totalPrevNMonths == null) return null;
    return computePercentChange(totalLastNMonths, totalPrevNMonths);
  }, [totalLastNMonths, totalPrevNMonths]);

  const monthlyPercentChange = useMemo(() => {
    if (prevMonthAmount == null) return null;
    // prevMonthAmount may be zero — computePercentChange handles that rule
    return computePercentChange(lastMonthAmount, prevMonthAmount);
  }, [lastMonthAmount, prevMonthAmount]);

  const transactionsCount = useMemo(() => {
    if (!expensesResp) return 0;
    return expensesResp.total ?? expensesResp.data?.length ?? 0;
  }, [expensesResp]);

  // previous month ISO (simple derivation)
  const prevMonthIso = useMemo(() => {
    try {
      const [yStr, mStr] = selMonth.split("-");
      const y = Number(yStr);
      const m = Number(mStr) - 1; // 0-based
      const prev = new Date(Date.UTC(y, m - 1, 1));
      return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}`;
    } catch {
      return null;
    }
  }, [selMonth]);

  const [prevStartStr, prevEndStr] = useMemo(
    () => (prevMonthIso ? monthToRange(prevMonthIso) : ["", ""]),
    [prevMonthIso]
  );

  // fetch previous month expenses for transactions delta
  const { data: prevExpensesResp } = useExpenses(
    prevStartStr && prevEndStr
      ? { from: prevStartStr, to: prevEndStr, limit: 5000, page: 1 }
      : undefined
  );

  const prevTransactionsCount = useMemo(() => {
    if (!prevExpensesResp) return 0;
    return prevExpensesResp.total ?? prevExpensesResp.data?.length ?? 0;
  }, [prevExpensesResp]);

  const transactionsPercentChange = useMemo(() => {
    return computePercentChange(transactionsCount, prevTransactionsCount);
  }, [transactionsCount, prevTransactionsCount]);

  const anyLoading = trendsLoading || categoryLoading || expensesLoading;

  // expose handlers + formatters
  const setSelMonth = (m: string) => setSelectedMonth(m);

  return {
    monthsAgo,

    trendsData,
    trendsLoading,

    categoryResp,
    categoryLoading,

    expensesResp,
    expensesLoading,

    categoriesList,

    selectorMonths,
    selMonth,
    setSelMonth,

    monthlyData,
    categoryData,

    totalLastNMonths,
    totalPrevNMonths,
    totalPercentChange,

    lastMonthAmount,
    prevMonthAmount,
    monthlyPercentChange,

    transactionsCount,
    prevTransactionsCount,
    transactionsPercentChange,

    anyLoading,

    formatNGN,
    formatNGNWithDecimals,
  } as unknown as DashboardData;
}
