// packages/client/src/App.tsx

import React from "react";
import { Routes, Route } from "react-router-dom";
import ROUTES from "@/utils/routes";

import LoginPage from "@/pages/auth/login";
import RegisterPage from "@/pages/auth/register";
import LandingPage from "@/pages/landingPage";
import DashboardPage from "@/pages/dashboard";
import ExpensesPage from "@/pages/expenses/expenses";
import BudgetsPage from "@/pages/budgets/budgets";
import CategoriesPage from "@/pages/categories/categories";
import { DashboardLayout } from "@/layouts";
import ReportsPage from "@/pages/reports";
import ExpenseEditorPage from "./pages/expenses/expenseEditorPage";
import BudgetEditorPage from "./pages/budgets/budgetEditorPage";
import CategoryEditorPage from "./pages/categories/categoryEditorPage";
import ProtectedRoute from "@/components/protectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<LandingPage />} />
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.REGISTER} element={<RegisterPage />} />

      {/* Protect the entire dashboard subtree so every /dashboard/* route requires auth */}
      <Route
        path={ROUTES.DASHBOARD}
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />

        {/* Expenses */}
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="expenses/new" element={<ExpenseEditorPage />} />
        <Route path="expenses/:id" element={<ExpenseEditorPage />} />

        {/* Budgets */}
        <Route path="budgets" element={<BudgetsPage />} />
        <Route path="budgets/new" element={<BudgetEditorPage />} />
        <Route path="budgets/:id" element={<BudgetEditorPage />} />

        {/* Categories */}
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="categories/new" element={<CategoryEditorPage />} />
        <Route path="categories/:id" element={<CategoryEditorPage />} />

        <Route path="reports" element={<ReportsPage />} />
      </Route>

      {/* fallback */}
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}
