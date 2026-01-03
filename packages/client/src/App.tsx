// packages/client/src/App.tsx

import React from "react";
import { Routes, Route } from "react-router-dom";
import { ROUTES } from "@/utils";

import { LoginPage, RegisterPage } from "@/pages/auth";

import { ExpensesPageWrapper, ExpenseEditorPage } from "@/pages/expenses";
import { BudgetsPage, BudgetEditorPage } from "@/pages/budgets/";
import { CategoriesPage, CategoryEditorPage } from "@/pages/categories";
import { DashboardLayout } from "@/layouts";
import { ReportsPage, LandingPage, DashboardPage } from "@/pages";
import { ProtectedRoute } from "@/components";

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
        <Route path="expenses" element={<ExpensesPageWrapper />} />
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
