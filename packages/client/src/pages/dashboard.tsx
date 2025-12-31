// packages/client/src/pages/dashboard.tsx

import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

import { useTrends, useCategoryReport } from "@/hooks/useReports";
import { useExpenses } from "@/hooks/useExpenses";
import { useCategories } from "@/hooks/useCategories";
import { format } from "date-fns";

/**
 * Dashboard page now wired to real data:
 * - trends: useTrends(6)
 * - category distribution: useCategoryReport for the current month
 * - transactions: useExpenses for current month
 *
 * Notes:
 * - The app supports multiple currencies (USD/NGN). At the moment category totals are
 *   combined numerically (totalUSD + totalNGN). This is functional for charts but not
 *   currency-accurate. If you want normalized currency (preferred for finance apps)
 *   we'll need an exchange-rate normalization step server- or client-side.
 */

function monthLabel(isoMonth: string) {
  try {
    const [y, m] = isoMonth.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return format(d, "MMM");
  } catch {
    return isoMonth;
  }
}

function formatNumber(n: number | undefined) {
  if (!n && n !== 0) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(n);
}

export default function DashboardPage() {
  const monthsAgo = 6;

  // trends for last N months
  const { data: trendsData, isLoading: trendsLoading } = useTrends(monthsAgo);

  // derive current month start/end in yyyy-MM-dd (UTC-style for consistency)
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth(); // 0-indexed
  const monthStart = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0));
  const monthEndDate = new Date(
    Date.UTC(currentYear, currentMonth + 1, 0, 0, 0, 0)
  ); // last day of month
  const monthStartStr = format(monthStart, "yyyy-MM-dd");
  const monthEndStr = format(monthEndDate, "yyyy-MM-dd");

  // trends chart data: combine currencies numerically (note: currency normalization not applied)
  const monthlyData =
    trendsData?.months?.map((m) => ({
      month: monthLabel(m.month),
      amount: (m.totalNGN ?? 0) + (m.totalUSD ?? 0),
    })) ?? [];

  // category distribution for current month
  const { data: categoryResp, isLoading: categoryLoading } = useCategoryReport(
    monthStartStr,
    monthEndStr
  );

  // fetch categories (for colors)
  const { data: categoriesList } = useCategories(true);
  const categoryNameToColor = useMemo(() => {
    const map = new Map<string, string>();
    (categoriesList || []).forEach((c: any) => {
      if (c?.name) map.set(c.name, c.color ?? "");
    });
    return map;
  }, [categoriesList]);

  const categoryData =
    categoryResp?.byCategory?.map((r, i) => {
      const total = (r.totalNGN ?? 0) + (r.totalUSD ?? 0);
      const color =
        categoryNameToColor.get(r.category) || `var(--chart-${(i % 8) + 1})`;
      return {
        name: r.category,
        value: total,
        color,
      };
    }) ?? [];

  // transactions for current month (for count)
  const { data: expensesResp, isLoading: expensesLoading } = useExpenses({
    from: monthStartStr,
    to: monthEndStr,
    limit: 5000,
    page: 1,
  });

  // compute some summary numbers
  const totalLastNMonths = monthlyData.reduce((s, x) => s + (x.amount ?? 0), 0);
  const lastMonthAmount = monthlyData.length
    ? monthlyData[monthlyData.length - 1].amount
    : 0;
  const prevMonthAmount =
    monthlyData.length > 1 ? monthlyData[monthlyData.length - 2].amount : 0;

  // percent change between previous and last month (for "savings rate" card we show change)
  const percentChange =
    prevMonthAmount === 0
      ? 0
      : Math.round(
          ((prevMonthAmount - lastMonthAmount) / prevMonthAmount) * 10000
        ) / 100;

  const transactionsCount =
    (expensesResp && (expensesResp.total ?? expensesResp.data?.length)) || 0;

  // loading state
  const anyLoading = trendsLoading || categoryLoading || expensesLoading;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Financial Overview
        </h1>
        <p className="text-muted-foreground">
          Monitor your spending and budgets for this month.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total (last {monthsAgo}mo)
            </CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {anyLoading ? "…" : formatNumber(totalLastNMonths)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-emerald-500 flex items-center font-medium">
                {percentChange >= 0
                  ? `+${percentChange}%`
                  : `${percentChange}%`}{" "}
                <ArrowUpRight className="h-3 w-3" />
              </span>{" "}
              aggregated across currencies
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Spending
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {anyLoading ? "…" : formatNumber(lastMonthAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-rose-500 flex items-center font-medium">
                {prevMonthAmount === 0
                  ? "—"
                  : `${
                      Math.round(
                        ((lastMonthAmount - prevMonthAmount) /
                          Math.max(1, prevMonthAmount)) *
                          10000
                      ) / 100
                    }%`}{" "}
                <ArrowUpRight className="h-3 w-3" />
              </span>{" "}
              compared to previous month
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Month change</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {anyLoading ? "…" : `${percentChange}%`}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-emerald-500 flex items-center font-medium">
                {percentChange >= 0 ? "+" : ""}
                {percentChange} <ArrowUpRight className="h-3 w-3" />
              </span>{" "}
              change vs prev month
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {anyLoading ? "…" : transactionsCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-emerald-500 flex items-center font-medium">
                {transactionsCount > 0 ? "-12%" : "—"}{" "}
                <ArrowDownRight className="h-3 w-3" />
              </span>{" "}
              volume vs prev month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-border/40 bg-card/40">
          <CardHeader>
            <CardTitle>Spending Trends</CardTitle>
            <CardDescription>
              Totals across the last {monthsAgo} months.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {trendsLoading ? (
              <div className="p-6">Loading trends…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "oklch(0.7 0.01 260)", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "oklch(0.7 0.01 260)", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.22 0.02 260)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                    }}
                    itemStyle={{ color: "oklch(0.95 0.01 260)" }}
                  />
                  <Bar
                    dataKey="amount"
                    fill="var(--color-brand-gold)"
                    radius={[4, 4, 0, 0]}
                  >
                    {monthlyData.map((entry, idx) => (
                      <Cell key={`m-${idx}`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3 border-border/40 bg-card/40">
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
            <CardDescription>
              Spending by category for {monthStartStr}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {categoryLoading ? (
              <div className="p-6">Loading categories…</div>
            ) : categoryData.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No category data for this month.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke="none"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.22 0.02 260)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}

            <div className="grid grid-cols-2 gap-2 mt-4 px-4">
              {categoryData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 text-xs text-muted-foreground px-4">
              Note: category totals shown are raw numeric sums (NGN + USD). If
              you want currency-normalized values, we should add an
              exchange-rate step (server or client side).
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
