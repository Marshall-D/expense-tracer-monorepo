// packages/client/src/pages/reports.tsx
import React, { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useTrends,
  useCategoryReport,
  useExportExpenses,
} from "@/hooks/useReports";
import { format } from "date-fns";

/**
 * ReportsPage wired to backend:
 * - Trends: /api/reports/trends?months=N
 * - By category: /api/reports/by-category?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Download/export: calls /api/expenses/export?from=YYYY-MM-DD&to=YYYY-MM-DD&format=csv
 */

function monthLabel(isoMonth: string) {
  // isoMonth is "YYYY-MM"
  try {
    const [y, m] = isoMonth.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return format(d, "MMM yyyy");
  } catch {
    return isoMonth;
  }
}

export default function ReportsPage() {
  const [monthsAgo] = useState<number>(6);

  // trends hook
  const { data: trendsData, isLoading: trendsLoading } = useTrends(monthsAgo);

  // category report for the most recent month (derive from trends data or default to current month)
  const latestMonth = trendsData?.months?.length
    ? trendsData.months[trendsData.months.length - 1].month
    : null;

  // build from/to for that month
  const [from, to] = useMemo(() => {
    if (!latestMonth) {
      const now = new Date();
      const thisMonth = `${now.getUTCFullYear()}-${String(
        now.getUTCMonth() + 1
      ).padStart(2, "0")}`;
      const start = `${thisMonth}-01`;
      const end = format(
        new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
        "yyyy-MM-dd"
      );
      return [start, end];
    }
    // latestMonth example: "2025-12"
    const [y, m] = latestMonth.split("-");
    const startDate = `${y}-${m}-01`;
    const endD = new Date(Number(y), Number(m), 0); // last day of month
    const endDate = format(endD, "yyyy-MM-dd");
    return [startDate, endDate];
  }, [latestMonth]);

  const { data: categoryResp, isLoading: categoryLoading } = useCategoryReport(
    from,
    to
  );

  // export mutation
  const exportMutation = useExportExpenses();
  const isLoading = exportMutation.status === "pending";

  // helper to build fallback filename
  function fallbackFileName(fromStr: string, toStr: string) {
    return `expenses_${fromStr}_${toStr}.csv`;
  }

  const handleDownload = async () => {
    try {
      // call mutateAsync to get the axios response (responseType: blob)
      const resp = await exportMutation.mutateAsync({
        from,
        to,
      });

      // resp might be an axios response; props: data, headers, status
      const respData = (resp as any)?.data ?? resp;
      const headers = (resp as any)?.headers ?? {};

      // If server responded with JSON error (e.g. validation), try to surface it
      // If respData is a Blob, we can use it directly
      let blob: Blob;
      if (respData instanceof Blob) {
        blob = respData;
      } else if (
        respData &&
        typeof respData === "object" &&
        respData.constructor?.name === "ArrayBuffer"
      ) {
        // axios with responseType 'arraybuffer'
        blob = new Blob([respData], {
          type: headers["content-type"] ?? "text/csv",
        });
      } else if (typeof respData === "string") {
        // Response came back as string (server returned a raw string)
        blob = new Blob([respData], {
          type: headers["content-type"] ?? "text/csv",
        });
      } else {
        // Last resort — attempt to stringify
        blob = new Blob([JSON.stringify(respData)], {
          type: "application/json",
        });
      }

      const url = window.URL.createObjectURL(blob);

      const disp =
        headers["content-disposition"] ||
        headers["Content-Disposition"] ||
        (headers["content-disposition"]
          ? headers["content-disposition"]
          : undefined);

      // If the server didn't expose Content-Disposition (CORS), fallback to a constructed filename
      let fileName = fallbackFileName(from, to);
      if (typeof disp === "string") {
        const m = disp.match(/filename="(.+)"/);
        if (m && m[1]) fileName = m[1];
        else {
          // Also try filename*=UTF-8''encoded form
          const m2 = disp.match(/filename\*=UTF-8''(.+)/i);
          if (m2 && m2[1]) fileName = decodeURIComponent(m2[1]);
        }
      }

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Export failed", err);
      // If server returned HTTP error with JSON, log that message to console to aid debugging:
      if (err?.response?.data) {
        try {
          // try to read text from blob if it's a blob
          const d = err.response.data;
          if (d instanceof Blob) {
            const text = await d.text();
            console.error("Server error body:", text);
          } else {
            console.error("Server error body:", d);
          }
        } catch (e) {
          // ignore
        }
      }
      // optionally show toast to user here
    }
  };

  // prepare data for charts
  const trendChartData =
    trendsData?.months?.map((m) => ({
      name: monthLabel(m.month),
      usd: m.totalUSD ?? 0,
      ngn: m.totalNGN ?? 0,
    })) ?? [];

  const byCategoryData =
    categoryResp?.byCategory?.map((r, i) => ({
      name: r.category,
      totalUSD: r.totalUSD ?? 0,
      totalNGN: r.totalNGN ?? 0,
      totalAll: (r.totalUSD ?? 0) + (r.totalNGN ?? 0),
      color: `var(--chart-${(i % 5) + 1})`,
    })) ?? [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Spending Reports
          </h1>
          <p className="text-muted-foreground">
            In-depth analysis of your financial performance over time.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full gap-2 bg-transparent"
          >
            <Calendar className="h-4 w-4" /> This Year
          </Button>
          <Button
            size="sm"
            className="rounded-full gap-2"
            onClick={handleDownload}
            disabled={isLoading}
          >
            <Download className="h-4 w-4" />{" "}
            {isLoading ? "Downloading…" : "Download CSV"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-border/40 bg-card/40">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Spending Trends</CardTitle>
                <CardDescription>
                  Totals by currency across the last {monthsAgo} months.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="h-[350px]">
            {trendsLoading ? (
              <div className="p-6">Loading trends…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendChartData}>
                  <defs>
                    <linearGradient id="gUSD" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#2563eb"
                        stopOpacity={0.12}
                      />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gNGN" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#10b981"
                        stopOpacity={0.12}
                      />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    dataKey="name"
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
                  />

                  <Area
                    type="monotone"
                    dataKey="ngn"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#gNGN)"
                  />
                  <Area
                    type="monotone"
                    dataKey="usd"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#gUSD)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3 border-border/40 bg-card/40">
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>
              Top categories for {from} → {to}
            </CardDescription>
          </CardHeader>

          <CardContent className="h-[350px]">
            {categoryLoading ? (
              <div className="p-6">Loading categories…</div>
            ) : byCategoryData.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No category data for the selected period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCategoryData} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "oklch(0.95 0.01 260)",
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                    width={140}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    contentStyle={{
                      backgroundColor: "oklch(0.22 0.02 260)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                    }}
                    formatter={(value: any, name: any, props: any) => {
                      // For nicer tooltip display
                      return [value, name];
                    }}
                  />
                  <Bar dataKey="totalAll" radius={[0, 4, 4, 0]} barSize={20}>
                    {byCategoryData.map((entry, idx) => (
                      <Cell key={entry.name + idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
