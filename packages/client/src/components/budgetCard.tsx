// packages/client/src/components/budgetCard.tsx
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
import { Pencil, Trash2, Wallet, AlertCircle } from "lucide-react";
import ROUTES from "@/utils/routes";
import { useBudgetSpending } from "@/hooks/useBudgetSpending";
import type { Budget } from "@/types/budget";

type Props = {
  budget: Budget;
  onDelete: (id: string, category: string) => void;
  isDeleting: boolean;
};

export function BudgetCard({ budget, onDelete, isDeleting }: Props) {
  const { data: spent = 0, isLoading } = useBudgetSpending({
    categoryId: budget.categoryId ?? undefined,
    category: budget.category ?? undefined,
    periodStart: budget.periodStart,
  });

  const spentValue = isLoading ? 0 : spent;
  const percentage = budget.amount > 0 ? (spentValue / budget.amount) * 100 : 0;
  const isOverBudget = percentage >= 90;

  return (
    <Card className="border-border/40 bg-card/40 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-background/50">
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
              disabled={isDeleting}
              onClick={() =>
                onDelete(budget.id!, budget.category ?? "Uncategorized")
              }
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
              {isLoading ? "—" : spentValue.toLocaleString()}
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
            {isNaN(percentage) ? "—" : `${percentage.toFixed(0)}%`}
          </span>
        </div>

        <Progress value={isNaN(percentage) ? 0 : percentage} className="h-2" />

        {isOverBudget && (
          <div className="flex items-center gap-2 text-xs text-destructive mt-3 bg-destructive/10 p-2 rounded-lg border border-destructive/20">
            <AlertCircle className="h-3 w-3" />
            Warning: You've reached {percentage.toFixed(0)}% of your budget.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
