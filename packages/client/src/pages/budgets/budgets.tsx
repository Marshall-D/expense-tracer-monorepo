// packages/client/src/pages/budgets/budgets.tsx

import React from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil, Trash2, Wallet, AlertCircle } from "lucide-react";
import ROUTES from "@/utils/routes";
import { useBudgets, useDeleteBudget } from "@/hooks/useBudgets";

export default function BudgetsPage() {
  const { data: budgets = [], isLoading, isError } = useBudgets();
  const deleteMutation = useDeleteBudget();

  const handleDelete = async (id: string, category: string) => {
    if (!confirm(`Delete budget for ${category}?`)) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err: any) {
      console.error("delete budget failed", err);
      alert(err?.message ?? "Delete failed");
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

        {/* navigate to: /dashboard/budgets/new */}
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
        <div>No budgets yet. Create one to get started.</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {budgets.map((budget) => {
            // server doesn't currently provide `spent` — show 0 and 0% until you add a spent calculation
            const spent = (budget as any).spent ?? 0;
            const percentage =
              budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
            const isOverBudget = percentage >= 90;

            return (
              <Card
                key={budget.id}
                className="border-border/40 bg-card/40 overflow-hidden"
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center bg-background/50"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        <Wallet className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {budget.category ?? "Uncategorized"}
                        </CardTitle>
                        <CardDescription>Monthly limit</CardDescription>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                      >
                        <Link to={ROUTES.BUDGETS_BY_ID(budget.id!)}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive/70"
                        onClick={() =>
                          handleDelete(
                            budget.id!,
                            budget.category ?? "Uncategorized"
                          )
                        }
                        disabled={deleteMutation.isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <span className="text-2xl font-bold">
                        {spent.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground text-sm ml-2">
                        of {budget.amount.toLocaleString()}
                      </span>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        isOverBudget ? "text-destructive" : "text-emerald-500"
                      }`}
                    >
                      {percentage.toFixed(0)}%
                    </span>
                  </div>

                  <Progress value={percentage} className="h-2 mb-2" />

                  {isOverBudget && (
                    <div className="flex items-center gap-2 text-xs text-destructive mt-3 bg-destructive/10 p-2 rounded-lg border border-destructive/20 animate-pulse">
                      <AlertCircle className="h-3 w-3" />
                      Warning: You've reached {percentage.toFixed(0)}% of your{" "}
                      {budget.category ?? "category"} budget.
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
