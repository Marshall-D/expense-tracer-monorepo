// packages/client/src/types/index.ts
// Explicit (type-only) re-exports for all type files in this folder.

export type {
  User,
  LoginPayload,
  RegisterPayload,
  AuthResponse,
  AuthContextValue,
} from "./auth";

export type {
  Budget,
  BudgetCreatePayload,
  BudgetUpdatePayload,
} from "./budget";

export type { Category } from "./categories";

export type {
  ExpenseCreatePayload,
  Expense,
  ExpensesListResponse,
} from "./expense";

export type {
  TrendMonth,
  TrendsResponse,
  MonthlyTotals,
  TopCategory,
  MonthlyReportResponse,
  ByCategoryRow,
  ByCategoryResponse,
} from "./report";

export type { DashboardData } from "./dashboard";
