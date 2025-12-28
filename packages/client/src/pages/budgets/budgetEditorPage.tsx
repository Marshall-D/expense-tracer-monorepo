// packages/client/src/pages/budgets/BudgetEditorPage.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BudgetForm from "./budgetForm";
import ROUTES from "@/utils/routes";
import type { Budget } from "@/types";
import { Button } from "@/components/ui/button";

const DUMMY_BUDGETS: Record<string, Budget> = {
  a: { id: "a", categoryId: "1", amount: 50000, currency: "NGN" },
  b: { id: "b", categoryId: "2", amount: 15000, currency: "NGN" },
};

export default function BudgetEditorPage(): JSX.Element {
  const { id } = useParams(); // id comes from route /dashboard/budgets/:id
  const isNew = !id;
  const navigate = useNavigate();

  const [initial, setInitial] = useState<Partial<Budget> | undefined>(
    undefined
  );
  const [loading, setLoading] = useState<boolean>(!!id);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setInitial(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    const t = setTimeout(() => {
      const found = DUMMY_BUDGETS[id as string];
      if (found) setInitial(found);
      else setError("Budget not found (dummy).");
      setLoading(false);
    }, 350);

    return () => clearTimeout(t);
  }, [id]);

  const handleSubmit = async (payload: Budget) => {
    setError(null);
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    navigate(ROUTES.BUDGETS);
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm("Delete this budget? This action cannot be undone.")) return;
    setDeleting(true);
    await new Promise((r) => setTimeout(r, 600));
    setDeleting(false);
    navigate(ROUTES.BUDGETS);
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
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        )}
      </div>

      <BudgetForm
        initial={initial ?? undefined}
        submitLabel={isNew ? "Create Budget" : "Save Changes"}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
