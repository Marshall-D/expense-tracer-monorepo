// packages/client/src/services/index.ts
// Explicit re-exports: the public API for the services folder.
// Keep this file curated — export only what other code should use.

export { loginApi, registerApi } from "./authService";

export {
  fetchBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget,
} from "./budgetService";

export {
  fetchCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from "./categoryService";

export {
  createExpense,
  fetchExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
} from "./expenseService";

export {
  fetchTrends,
  fetchMonthlyReport,
  fetchByCategory,
  exportExpenses,
} from "./reportService";
