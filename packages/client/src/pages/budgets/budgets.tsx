// packages/client/src/pages/budgets/budgets.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { ROUTES } from "@/utils";
import { useBudgets, useDeleteBudget } from "@/hooks";
import { InfoModal, BudgetCard, Button } from "@/components";
import { t } from "@/lib";

export default function BudgetsPage() {
  const { data: budgets = [], isLoading, isError } = useBudgets();
  const deleteMutation = useDeleteBudget();
  const isDeleting = deleteMutation.status === "pending";

  // modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    category: string;
  } | null>(null);

  // called by BudgetCard -> onDelete(id, category)
  const requestDelete = (id: string, category: string) => {
    setDeleteTarget({ id, category });
    setDeleteModalOpen(true);
  };

  const performDelete = async () => {
    if (!deleteTarget) return;
    const { id, category } = deleteTarget;
    try {
      await deleteMutation.mutateAsync(id);
      t.success(`Budget for ${category} deleted`);
    } catch (err: any) {
      console.error("delete budget failed", err);
      t.error(err?.message ?? "Delete failed");
    } finally {
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
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
          {budgets.map((budget) => (
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
        onCancel={() => {
          setDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={performDelete}
      />
    </div>
  );
}
