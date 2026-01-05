// packages/client/src/hooks/index.ts

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

export { useExpensesPage } from "./useExpensesPage";

export { useCategoryActions } from "./useCategoryActions";

export { useBudgetsData } from "./useBudgetsData";

export { useLoginHandler, useRegisterHandler } from "./useAuthHandlers";
