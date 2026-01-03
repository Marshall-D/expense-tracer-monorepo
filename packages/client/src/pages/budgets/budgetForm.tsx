// packages/client/src/pages/budgets/BudgetForm.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Input,
  Button,
} from "@/components";
import type { Budget } from "@/types";
import { useCategories } from "@/hooks";
import { format } from "date-fns";

type Props = {
  initial?: Partial<Budget> | undefined;
  onSubmit: (payload: Budget) => Promise<void>;
  submitLabel?: string;
  submitting?: boolean;
};

/** returns array of months starting from current and next n months (inclusive) */
function nextNMonths(n = 6) {
  const arr: string[] = [];
  const now = new Date();
  for (let i = 0; i <= n; i++) {
    const d = new Date(now.getUTCFullYear(), now.getUTCMonth() + i, 1);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    arr.push(`${y}-${m}`);
  }
  return arr;
}

export function BudgetForm({
  initial,
  onSubmit,
  submitLabel = "Save",
  submitting = false,
}: Props) {
  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories(true);

  const initialMonth =
    initial && initial.periodStart
      ? String(initial.periodStart).slice(0, 7)
      : "";

  // compute selector months: current + next 6 months
  const selectorMonths = useMemo(() => nextNMonths(6), []);

  const defaultMonth = initialMonth || selectorMonths[0]; // current month by default

  const [categoryId, setCategoryId] = useState<string>(
    () => initial?.categoryId ?? ""
  );
  const [amount, setAmount] = useState<string>(
    () => initial?.amount?.toString() ?? ""
  );
  const [periodMonth, setPeriodMonth] = useState<string>(() => defaultMonth);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initial) return;
    setCategoryId(initial.categoryId ?? "");
    setAmount(initial.amount?.toString() ?? "");
    setPeriodMonth(
      initial.periodStart
        ? String(initial.periodStart).slice(0, 7)
        : defaultMonth
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = Number(amount);

    if (!categoryId) {
      setError("Choose a category");
      return;
    }

    if (!periodMonth) {
      setError("Choose a period (month)");
      return;
    }
    if (!selectorMonths.includes(periodMonth)) {
      setError("Choose a month from the selector (current + next 6 months).");
      return;
    }

    if (!parsed || parsed <= 0) {
      setError("Enter a valid amount greater than 0");
      return;
    }

    setLoading(true);
    try {
      const periodStartIso = `${periodMonth}-01`;
      await onSubmit({
        categoryId: categoryId,
        amount: parsed,
        periodStart: periodStartIso,
      } as Budget);
    } catch (err: any) {
      const msg = err?.message ?? "Save failed";
      setError(msg);
      throw err;
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
        <form onSubmit={handle} className="space-y-4" noValidate>
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
            <select
              id="period"
              value={periodMonth}
              onChange={(e) => setPeriodMonth(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border/20"
              required
            >
              {selectorMonths.map((m) => {
                const [y, mm] = m.split("-");
                const d = new Date(Number(y), Number(mm) - 1, 1);
                const label = format(d, "MMM yyyy");
                return (
                  <option key={m} value={m}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <Label htmlFor="amount">Amount (NGN)</Label>
            <Input
              id="amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
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
