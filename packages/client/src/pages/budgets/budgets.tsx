// packages/client/src/pages/budgets/budgets.tsx
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ROUTES from "@/utils/routes";
import { useBudgets, useDeleteBudget } from "@/hooks/useBudgets";
import { BudgetCard } from "@/components/budgetCard";

export default function BudgetsPage() {
  const { data: budgets = [], isLoading, isError } = useBudgets();
  const deleteMutation = useDeleteBudget();
  const isDeleting = deleteMutation.status === "pending";

  const handleDelete = async (id: string, category: string) => {
    if (!confirm(`Delete budget for ${category}?`)) return;
    await deleteMutation.mutateAsync(id);
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
              onDelete={handleDelete}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      )}
    </div>
  );
}
