// packages/client/src/pages/dashboard.tsx
import React, { useMemo, useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components";
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

import {
  useTrends,
  useCategoryReport,
  useExpenses,
  useCategories,
} from "@/hooks";

import { format } from "date-fns";

function monthLabel(isoMonth: string | null) {
  if (!isoMonth) return "—";
  try {
    const [y, m] = isoMonth.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return format(d, "MMM yyyy");
  } catch {
    return String(isoMonth);
  }
}

function monthShort(isoMonth: string | null) {
  if (!isoMonth) return "—";
  try {
    const [y, m] = isoMonth.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return format(d, "MMM");
  } catch {
    return String(isoMonth);
  }
}

function formatNumber(n: number | undefined) {
  if (!n && n !== 0) return "—";
  return `₦${new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: 0,
  }).format(n)}`;
}

function monthToRange(isoMonth: string) {
  const [y, m] = isoMonth.split("-");
  const year = Number(y);
  const month = Number(m) - 1;
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 0, 0, 0, 0));
  return [format(start, "yyyy-MM-dd"), format(end, "yyyy-MM-dd")];
}

export function DashboardPage() {
  const monthsAgo = 6;

  // trends for last N months (NGN-only)
  const { data: trendsData, isLoading: trendsLoading } = useTrends(monthsAgo);

  // build a list of available months from trends (ordered oldest -> newest)
  const availableMonths = useMemo(() => {
    const months = trendsData?.months?.map((m) => m.month) ?? [];
    return months;
  }, [trendsData]);

  // Determine current month as fallback (YYYY-MM)
  const now = new Date();
  const currentIsoMonth = `${now.getUTCFullYear()}-${String(
    now.getUTCMonth() + 1
  ).padStart(2, "0")}`;

  // selectedMonth stores "YYYY-MM"
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // initialize selectedMonth when trendsData arrives (pick latest month)
  useEffect(() => {
    if (!selectedMonth) {
      const latest =
        trendsData?.months && trendsData.months.length
          ? trendsData.months[trendsData.months.length - 1].month
          : currentIsoMonth;
      setSelectedMonth(latest);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trendsData]);

  // If trends not available, ensure at least current month appears in selector
  const selectorMonths =
    availableMonths && availableMonths.length > 0
      ? availableMonths
      : [currentIsoMonth];

  // Compute start/end strings for the selected month; fall back to current month if null
  const selMonth = selectedMonth ?? currentIsoMonth;
  const [monthStartStr, monthEndStr] = monthToRange(selMonth);

  // trends chart data: use NGN totals only
  const monthlyData =
    trendsData?.months?.map((m) => ({
      month: monthLabel(m.month),
      amount: m.totalNGN ?? 0,
    })) ?? [];

  // category distribution for selected month (NGN-only)
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
      const total = r.totalNGN ?? 0;
      const color =
        categoryNameToColor.get(r.category) || `var(--chart-${(i % 8) + 1})`;
      return {
        name: r.category,
        value: total,
        color,
      };
    }) ?? [];

  // transactions for selected month (for count)
  const { data: expensesResp, isLoading: expensesLoading } = useExpenses({
    from: monthStartStr,
    to: monthEndStr,
    limit: 5000,
    page: 1,
  });

  // compute some summary numbers (NGN-only)
  const totalLastNMonths = monthlyData.reduce((s, x) => s + (x.amount ?? 0), 0);
  const lastMonthAmount = monthlyData.length
    ? monthlyData[monthlyData.length - 1].amount
    : 0;
  const prevMonthAmount =
    monthlyData.length > 1 ? monthlyData[monthlyData.length - 2].amount : 0;

  // percent change between previous and last month
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

  // tooltip formatter (NGN)
  const ngnFormatter = (value: any) =>
    value == null ? "—" : `₦${new Intl.NumberFormat("en-NG").format(value)}`;

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
              totals for the last {monthsAgo} months
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
                    formatter={(value) => ngnFormatter(value)}
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
          <CardHeader className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Category Distribution</CardTitle>
              <CardDescription>
                Spending by category for{" "}
                <span className="font-medium">
                  {monthLabel(selectedMonth ?? currentIsoMonth)}
                </span>
              </CardDescription>
            </div>

            {/* Month selector */}
            <div className="ml-auto">
              <select
                aria-label="Select month"
                value={selectedMonth ?? currentIsoMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-9 rounded-md border border-border/20 bg-background/60 px-2 text-sm"
              >
                {selectorMonths.map((m) => (
                  <option key={m} value={m}>
                    {monthShort(m)}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>

          {/* Chart + Legend container */}
          <CardContent>
            {categoryLoading ? (
              <div className="p-6">Loading categories…</div>
            ) : categoryData.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No category data for this month.
              </div>
            ) : (
              <div className="flex flex-col">
                {/* fixed-height chart container so legend is always below */}
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={56}
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
                        formatter={(value) => ngnFormatter(value)}
                        contentStyle={{
                          backgroundColor: "oklch(0.22 0.02 260)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* legend always outside the chart, consistent placement */}
                <div className="mt-4 px-4">
                  <div className="max-h-36 overflow-auto">
                    <div className="grid grid-cols-1 gap-2">
                      {categoryData.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <div className="text-sm text-muted-foreground">
                              {item.name}
                            </div>
                          </div>
                          <div className="text-sm font-medium">
                            {ngnFormatter(item.value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
