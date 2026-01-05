/**
 * packages/client/src/pages/dashboard/DashboardView.tsx
 *
 * Presentational view for Dashboard. Receives derived data + handlers via props.
 * - shows totals, monthly, month-change and transactions with correct percentages
 */

import React from "react";
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

import { monthLabel, monthShort } from "@/lib";
import type { DashboardData } from "@/types";

type Props = {
  data: DashboardData;
};

export function DashboardView({ data }: Props) {
  const {
    monthsAgo,
    monthlyData,
    categoryData,
    selectorMonths,
    selMonth,
    setSelMonth,
    totalLastNMonths,

    lastMonthAmount,
    monthlyPercentChange,
    transactionsCount,
    transactionsPercentChange,
    anyLoading,
    formatNGN,
    formatNGNWithDecimals,
  } = data;

  // tooltip formatter for NGN used inside charts
  const ngnFormatter = (value: any) =>
    value == null ? "—" : formatNGNWithDecimals(Number(value));

  // small helper to render percent or '—' when null
  const showPercent = (p: number | null | undefined) =>
    p == null ? "—" : `${p >= 0 ? "+" : ""}${p}%`;

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
        {/* TOTAL: last N months */}
        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total (last {monthsAgo}mo)
            </CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {anyLoading ? "…" : formatNGN(totalLastNMonths)}
            </div>
          </CardContent>
        </Card>

        {/* Monthly */}
        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Spending
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {anyLoading ? "…" : formatNGN(lastMonthAmount)}
            </div>
          </CardContent>
        </Card>

        {/* Month change */}
        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Month change</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {anyLoading ? "…" : showPercent(monthlyPercentChange)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-emerald-500 flex items-center font-medium">
                {monthlyPercentChange != null && monthlyPercentChange >= 0
                  ? "+"
                  : ""}
                {monthlyPercentChange == null ? "—" : monthlyPercentChange}{" "}
                <ArrowUpRight className="h-3 w-3" />
              </span>{" "}
              change vs prev month
            </p>
          </CardContent>
        </Card>

        {/* Transactions */}
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
              <span
                className={`flex items-center font-medium ${transactionsPercentChange != null && transactionsPercentChange > 0 ? "text-emerald-500" : ""}`}
              >
                {showPercent(transactionsPercentChange)}{" "}
                <ArrowDownRight className="h-3 w-3" />
              </span>{" "}
              volume vs prev month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Trends bar chart */}
        <Card className="col-span-4 border-border/40 bg-card/40">
          <CardHeader>
            <CardTitle>Spending Trends</CardTitle>
            <CardDescription>
              Totals across the last {monthsAgo} months.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData.map((d) => ({
                  ...d,
                  monthLabel: monthLabel(d.month),
                }))}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="monthLabel"
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
          </CardContent>
        </Card>

        {/* Category distribution — add mobile bottom padding so chart isn't covered by nav */}
        <Card className="col-span-3 border-border/40 bg-card/40">
          <CardHeader className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Category Distribution</CardTitle>
              <CardDescription>
                Spending by category for{" "}
                <span className="font-medium">{monthLabel(selMonth)}</span>
              </CardDescription>
            </div>

            <div className="ml-auto">
              <select
                aria-label="Select month"
                value={selMonth}
                onChange={(e) => setSelMonth(e.target.value)}
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

          {/* IMPORTANT: pb-24 prevents mobile bottom nav from covering chart.
              You can tweak this value to match your app's bottom nav height. */}
          <CardContent className="pb-24 lg:pb-0">
            <div className="flex flex-col">
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
                          {formatNGN(item.value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
