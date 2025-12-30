// packages/client/src/pages/budgets/BudgetForm.tsx
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Budget } from "@/types/budget";
import { useCategories } from "@/hooks/useCategories";

type Props = {
  initial?: Partial<Budget> | undefined;
  onSubmit: (payload: Budget) => Promise<void>;
  submitLabel?: string;
  submitting?: boolean;
};

export default function BudgetForm({
  initial,
  onSubmit,
  submitLabel = "Save",
  submitting = false,
}: Props) {
  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories(true);

  // initialize from initial only once; keep controlled state afterwards
  const [categoryId, setCategoryId] = useState<string>(
    () => initial?.categoryId ?? ""
  );
  const [amount, setAmount] = useState<string>(
    () => initial?.amount?.toString() ?? ""
  );
  const initialMonth =
    initial && initial.periodStart
      ? String(initial.periodStart).slice(0, 7)
      : "";
  const [periodMonth, setPeriodMonth] = useState<string>(() => initialMonth);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync only if an explicit `initial` object is provided (e.g., editing)
  useEffect(() => {
    if (!initial) return;
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

    // Enforce required category
    if (!categoryId) {
      return setError("Choose a category");
    }

    if (!periodMonth) return setError("Choose a period (month)");
    if (!parsed || parsed <= 0) return setError("Enter a valid amount");
    setLoading(true);
    try {
      // convert YYYY-MM -> YYYY-MM-01 ISO
      const periodStartIso = `${periodMonth}-01`;
      await onSubmit({
        categoryId: categoryId,
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
              required
            >
              <option value="" disabled>
                -- select category --
              </option>
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
