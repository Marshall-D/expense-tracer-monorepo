/**
 * packages/client/src/types/dashboard.ts
 
 */

export type DashboardData = {
  /** number of months used for the trends window (e.g. 6) */
  monthsAgo: number;

  /** Raw fetched responses (left loosely typed to avoid coupling with server types) */
  trendsData?: any;
  trendsLoading: boolean;

  categoryResp?: any;
  categoryLoading: boolean;

  expensesResp?: any;
  expensesLoading: boolean;

  categoriesList?: any[];

  /** --- Derived & UI-friendly values --- */

  /** list of ISO month strings available for selection, oldest -> newest, e.g. ["2025-07", "2025-08"] */
  selectorMonths: string[];

  /** currently selected month for the small-month selector, e.g. "2025-08" */
  selMonth: string;

  /** handler to update selMonth from the view */
  setSelMonth: (m: string) => void;

  /** simplified monthly series for the bar chart (NGN-only): { month: "YYYY-MM", amount: number } */
  monthlyData: { month: string; amount: number }[];

  /** pie chart data for categories (NGN-only) */
  categoryData: { name: string; value: number; color: string }[];

  /** Sum of amounts across the last `monthsAgo` months (NGN-only) */
  totalLastNMonths: number;

  /**
   * Sum of the previous `monthsAgo` months (used to compute totalPercentChange).
   * `null` indicates not enough historical data to compute a comparison window.
   */
  totalPrevNMonths: number | null;

  /**
   * Percent change comparing totalLastNMonths vs totalPrevNMonths.
   * - `null` when not computable (not enough history)
   * - otherwise a number e.g. 12.34
   */
  totalPercentChange: number | null;

  /** last month (most recent) total amount (NGN) */
  lastMonthAmount: number;

  /** previous month amount (NGN) used for month-over-month comparison */
  prevMonthAmount: number;

  /**
   * Percent change for the most recent month vs previous month.
   * `null` when not computable.
   */
  monthlyPercentChange: number | null;

  /** number of transactions in the selected month (from expensesResp) */
  transactionsCount: number;

  /** number of transactions in the previous month (used for comparison) */
  prevTransactionsCount: number;

  /** percent change for transactionsCount vs prevTransactionsCount (null if not computable) */
  transactionsPercentChange: number | null;

  /** convenience loading flag (true if any of the underlying queries are loading) */
  anyLoading: boolean;

  /** formatting helpers forwarded to the view (string outputs) */
  formatNGN: (n?: number | null) => string;
  formatNGNWithDecimals: (n?: number | null) => string;
};
