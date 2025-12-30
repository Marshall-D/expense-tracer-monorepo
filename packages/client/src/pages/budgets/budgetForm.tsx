// packages/client/src/pages/budgets/BudgetForm.tsx

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Budget } from "@/types/budget";
import { useCategories } from "@/hooks/useCategories";

type Props = {
  initial?: Partial<Budget>;
  onSubmit: (payload: Budget) => Promise<void>;
  submitLabel?: string;
  submitting?: boolean;
};

export default function BudgetForm({
  initial = {},
  onSubmit,
  submitLabel = "Save",
  submitting = false,
}: Props) {
  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories(true);

  const [categoryId, setCategoryId] = useState(initial.categoryId ?? "");
  const [amount, setAmount] = useState(initial.amount?.toString() ?? "");
  // use input type="month" for period selection (value like YYYY-MM)
  const initialMonth = initial.periodStart
    ? String(initial.periodStart).slice(0, 7)
    : "";
  const [periodMonth, setPeriodMonth] = useState(initialMonth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // sync if initial changes (e.g., after fetch)
    setCategoryId(initial.categoryId ?? "");
    setAmount(initial.amount?.toString() ?? "");
    setPeriodMonth(
      initial.periodStart ? String(initial.periodStart).slice(0, 7) : ""
    );
  }, [initial]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = Number(amount);
    if (!periodMonth) return setError("Choose a period (month)");
    if (!parsed || parsed <= 0) return setError("Enter a valid amount");
    setLoading(true);
    try {
      // convert YYYY-MM -> YYYY-MM-01 ISO
      const periodStartIso = `${periodMonth}-01`;
      await onSubmit({
        categoryId: categoryId || undefined,
        amount: parsed,
        periodStart: periodStartIso,
      } as Budget);
    } catch (err: any) {
      setError(err?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{submitLabel} budget</CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handle} className="space-y-4">
          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-10 rounded-md border border-border/20"
              disabled={categoriesLoading}
            >
              <option value="">-- select category (optional) --</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="period">Period (month)</Label>
            <input
              id="period"
              type="month"
              value={periodMonth}
              onChange={(e) => setPeriodMonth(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border/20"
              required
            />
          </div>

          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {error && <div className="text-destructive text-sm">{error}</div>}

          <div>
            <Button
              type="submit"
              className="rounded-full"
              disabled={loading || submitting}
            >
              {loading || submitting ? "Saving..." : submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
