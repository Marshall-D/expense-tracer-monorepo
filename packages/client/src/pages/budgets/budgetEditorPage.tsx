// packages/client/src/pages/budgets/BudgetEditorPage.tsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BudgetForm from "./budgetForm";
import ROUTES from "@/utils/routes";
import type { Budget } from "@/types/budget";
import { Button } from "@/components/ui/button";
import {
  useBudget,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
} from "@/hooks/useBudgets";

export default function BudgetEditorPage(): JSX.Element {
  const { id } = useParams(); // id comes from route /dashboard/budgets/:id
  const isNew = !id;
  const navigate = useNavigate();

  const { data: fetchedBudget, isLoading: fetching } = useBudget(id);
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const deleteMutation = useDeleteBudget();

  const [initial, setInitial] = useState<Partial<Budget> | undefined>(
    undefined
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setInitial(undefined);
      return;
    }
    if (fetchedBudget) {
      // map server payload to form initial
      const e = fetchedBudget;
      setInitial({
        id: e.id,
        categoryId: e.categoryId ?? "",
        amount: e.amount,
        // periodStart should be YYYY-MM or ISO; form will convert if present
        periodStart: e.periodStart ?? undefined,
      } as any);
    }
  }, [id, fetchedBudget]);

  const handleSubmit = async (payload: Budget) => {
    setError(null);
    setSaving(true);
    try {
      if (isNew) {
        // create expects periodStart, amount, optional categoryId/category
        await createMutation.mutateAsync({
          categoryId: payload.categoryId ?? undefined,
          periodStart: payload.periodStart as unknown as string,
          amount: payload.amount,
        });
      } else {
        if (!id) throw new Error("Missing id");
        await updateMutation.mutateAsync({ id, payload });
      }
      navigate(ROUTES.BUDGETS);
    } catch (err: any) {
      setError(err?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm("Delete this budget? This action cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteMutation.mutateAsync(id);
      navigate(ROUTES.BUDGETS);
    } catch (err: any) {
      setError(err?.message ?? "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  if (fetching) return <div>Loading budget…</div>;
  if (!isNew && error)
    return <div className="text-sm text-destructive">Error: {error}</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isNew ? "New Budget" : "Edit Budget"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isNew
              ? "Set a spending limit for a category."
              : "Update the budget amount or category."}
          </p>
        </div>

        {!isNew && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(ROUTES.BUDGETS)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting || deleteMutation.isLoading}
            >
              {deleting || deleteMutation.isLoading ? "Deleting…" : "Delete"}
            </Button>
          </div>
        )}
      </div>

      <BudgetForm
        initial={initial ?? undefined}
        submitLabel={isNew ? "Create Budget" : "Save Changes"}
        onSubmit={handleSubmit}
        submitting={
          saving || createMutation.isLoading || updateMutation.isLoading
        }
      />
    </div>
  );
}
