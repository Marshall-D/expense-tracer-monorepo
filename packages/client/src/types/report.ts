// packages/client/src/types/report.ts

export type TrendMonth = {
  // returned by /api/reports/trends -> months array
  month: string; // "YYYY-MM"
  totalUSD?: number;
  totalNGN?: number;
};

export type TrendsResponse = {
  months: TrendMonth[];
};

export type MonthlyTotals = {
  currency: string;
  total: number;
  count?: number;
  avg?: number;
};

export type TopCategory = {
  categoryId?: string | null;
  category: string;
  total: number;
};

export type MonthlyReportResponse = {
  period: string; // "YYYY-MM"
  totals: MonthlyTotals[]; // totals by currency
  topCategories: TopCategory[];
};

export type ByCategoryRow = {
  categoryId?: string | null;
  category: string;
  totalUSD?: number;
  totalNGN?: number;
};

export type ByCategoryResponse = {
  from: string;
  to: string;
  byCategory: ByCategoryRow[];
};
