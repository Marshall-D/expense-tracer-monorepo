// packages/client/src/pages/budgets/BudgetEditorPage.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ROUTES } from "@/utils";
import type { Budget } from "@/types";
import { Button, InfoModal } from "@/components";
import {
  useBudget,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
} from "@/hooks";
import { BudgetForm } from "./budgetForm";
import { t } from "@/lib";

export function BudgetEditorPage(): JSX.Element {
  const { id } = useParams(); // id comes from route /dashboard/budgets/:id
  const isNew = !id;
  const navigate = useNavigate();

  const budgetQuery = useBudget(id);
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const deleteMutation = useDeleteBudget();

  const [error, setError] = useState<string | null>(null);

  // loading follows same logic as ExpenseEditorPage: only loading when editing
  const loading = isNew ? false : budgetQuery.isLoading;

  // derive booleans using status (type-safe)
  const isCreating = createMutation.status === "pending";
  const isUpdating = updateMutation.status === "pending";
  const isDeleting = deleteMutation.status === "pending";

  // map fetched budget to initial form shape (Partial<Budget>)
  const initial = useMemo<Partial<Budget> | undefined>(() => {
    if (!budgetQuery.data) return undefined;
    const b = budgetQuery.data;
    return {
      id: b.id,
      categoryId: b.categoryId ?? "",
      amount: b.amount,
      periodStart: b.periodStart ?? undefined,
      category: b.category ?? undefined,
    } as Partial<Budget>;
  }, [budgetQuery.data]);

  useEffect(() => {
    if (!isNew && budgetQuery.isError) {
      setError("Failed to load budget.");
    }
  }, [isNew, budgetQuery.isError]);

  const handleSubmit = async (payload: Budget) => {
    setError(null);
    try {
      if (isNew) {
        // build create payload matching service type
        const createPayload: any = {
          amount: payload.amount,
          periodStart: payload.periodStart as unknown as string,
        };
        if (payload.categoryId !== undefined && payload.categoryId !== "") {
          createPayload.categoryId = payload.categoryId;
        } else if (payload.category) {
          // allow creating with a category name fallback
          createPayload.category = payload.category;
        }
        await createMutation.mutateAsync(createPayload);
        t.success("Budget created");
      } else {
        if (!id) throw new Error("Missing id");

        // build update payload with strict typing:
        const updatePayload: any = {};
        if (typeof payload.amount !== "undefined")
          updatePayload.amount = payload.amount;

        if (typeof payload.categoryId !== "undefined") {
          // empty string means "no category" from the form — convert to null for server
          updatePayload.categoryId =
            payload.categoryId === "" ? null : payload.categoryId;
        } else if (
          typeof payload.category !== "undefined" &&
          payload.category !== null
        ) {
          updatePayload.category = payload.category;
        }

        if (typeof payload.periodStart !== "undefined" && payload.periodStart) {
          updatePayload.periodStart = payload.periodStart as unknown as string;
        }

        await updateMutation.mutateAsync({ id, payload: updatePayload });
        t.success("Budget updated");
      }

      // optimistic updates handled in hooks; navigate to list
      navigate(ROUTES.BUDGETS);
    } catch (err: any) {
      const msg = err?.message ?? "Save failed";
      setError(msg);
      t.error(msg);
    }
  };

  // Modal state for delete confirmation
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const handleDeleteRequest = () => {
    // open modal
    setDeleteModalOpen(true);
  };

  const performDelete = async () => {
    if (!id) return;
    setError(null);
    try {
      await deleteMutation.mutateAsync(id);
      t.success("Budget deleted");
      navigate(ROUTES.BUDGETS);
    } catch (err: any) {
      const msg = err?.message ?? "Delete failed";
      setError(msg);
      t.error(msg);
    } finally {
      setDeleteModalOpen(false);
    }
  };

  if (loading) return <div>Loading budget…</div>;
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
              onClick={handleDeleteRequest}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        )}
      </div>

      <BudgetForm
        initial={initial ?? undefined}
        submitLabel={isNew ? "Create Budget" : "Save Changes"}
        onSubmit={handleSubmit}
        submitting={isCreating || isUpdating}
      />

      <InfoModal
        open={deleteModalOpen}
        title="Delete budget?"
        message="This action will permanently delete the budget. Are you sure?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={isDeleting}
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={performDelete}
      />
    </div>
  );
}
