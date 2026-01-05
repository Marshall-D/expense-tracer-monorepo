// packages/client/src/pages/budgets/BudgetsView.tsx
/**
 * BudgetsView (presentational)
 *
 * Receives all data and handlers via props and renders the UI.
 *
 */

import React from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { ROUTES } from "@/utils";
import { InfoModal, BudgetCard, Button } from "@/components";
import type { Budget } from "@/types";
import type { UseBudgetsDataResult } from "@/types";

type Props = UseBudgetsDataResult;

export function BudgetsView({
  budgets,
  isLoading,
  isError,
  deleteModalOpen,
  deleteTarget,
  requestDelete,
  cancelDelete,
  confirmDelete,
  isDeleting,
}: Props) {
  return (
    <div
      className="space-y-6 animate-in fade-in duration-500 pb-24 lg:pb-0"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 6rem)" }}
    >
      {" "}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground">
            Set spending limits and track category performance.
          </p>
        </div>

        <Button asChild size="sm" className="rounded-full gap-2">
          <Link to={ROUTES.BUDGETS_NEW}>
            <Plus className="h-4 w-4" /> Set Budget
          </Link>
        </Button>
      </div>
      {isLoading ? (
        <div>Loading budgets…</div>
      ) : isError ? (
        <div className="text-destructive">Failed to load budgets.</div>
      ) : budgets.length === 0 ? (
        <div>No budgets yet.</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {budgets.map((budget: Budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onDelete={requestDelete}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      )}
      <InfoModal
        open={deleteModalOpen}
        title={
          deleteTarget
            ? `Delete budget for ${deleteTarget.category}?`
            : "Delete budget?"
        }
        message="This action will permanently delete the budget. Are you sure?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={isDeleting}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
