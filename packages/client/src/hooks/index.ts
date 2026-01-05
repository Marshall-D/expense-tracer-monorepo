// packages/client/src/hooks/index.ts
// Explicit re-exports — this is the public API surface for the hooks folder.
// Keep this file curated: only export what's intended to be used by other modules.

export {
  useBudgets,
  useBudget,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
} from "./useBudgets";
export { useBudgetSpending } from "./useBudgetSpending";
export { useCategories } from "./useCategories";
export {
  useExpenses,
  useExpense,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
} from "./useExpenses";
export { useLogin } from "./useLogin";
export { useRegister } from "./useRegister";
export {
  useTrends,
  useMonthlyReport,
  useCategoryReport,
  useExportExpenses,
} from "./useReports";

export { useDashboardData } from "./useDashboardData";
