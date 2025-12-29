// packages/client/src/pages/expenses/expenses.tsx
import React, { Suspense, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  Plus,
  Pencil,
  Trash2,
  Download,
  X,
} from "lucide-react";
import ROUTES from "@/utils/routes";
import { useExpenses, useDeleteExpense } from "@/hooks/useExpenses";
import { useCategories } from "@/hooks/useCategories";
import { useMedia } from "react-use";

/**
 * Debounce hook
 */
function useDebouncedValue<T>(value: T, delayMs = 300) {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Simple slide-in drawer / modal for mobile/tablet.
 * Controlled by `open` boolean and `onClose`.
 */
function SlideDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // small screens treat it as full screen modal; larger tablets as right-side drawer
  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-50 transition-all ${
        open ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      {/* backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={`absolute right-0 top-0 bottom-0 w-full sm:w-[520px] md:w-[420px] lg:hidden bg-card/90 backdrop-blur-md transform transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-4 h-full overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export default function ExpensesPageWrapper() {
  return (
    <Suspense fallback={null}>
      <ExpensesContent />
    </Suspense>
  );
}

function ExpensesContent() {
  const [searchParams, setSearchParams] = useSearchParams();

  // initial values from URL (applied)
  const initialQ = searchParams.get("q") || "";
  const initialCategoryIds = (searchParams.get("categoryIds") || "")
    .split(",")
    .filter(Boolean);
  const initialFrom = searchParams.get("from") || "";
  const initialTo = searchParams.get("to") || "";

  // search input (debounced)
  const [searchTerm, setSearchTerm] = useState(initialQ);
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  // categories list
  const { data: categories = [] } = useCategories(true);

  // Panel / drawer open states
  const isDesktop = useMedia("(min-width: 1024px)");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Working (unapplied) filters — what user edits in the panel
  const [workingCategoryIds, setWorkingCategoryIds] =
    useState<string[]>(initialCategoryIds);
  const [workingFrom, setWorkingFrom] = useState(initialFrom);
  const [workingTo, setWorkingTo] = useState(initialTo);

  // Applied filters (used in query)
  const [appliedCategoryIds, setAppliedCategoryIds] =
    useState<string[]>(initialCategoryIds);
  const [appliedFrom, setAppliedFrom] = useState<string | undefined>(
    initialFrom || undefined
  );
  const [appliedTo, setAppliedTo] = useState<string | undefined>(
    initialTo || undefined
  );

  // keep local searchTerm in sync when URL provided externally
  useEffect(() => {
    setSearchTerm(initialQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Date validation
  const dateRangeInvalid =
    Boolean(workingFrom && workingTo) && workingFrom > workingTo;

  // Prepare params object for react-query hook
  const params = useMemo(() => {
    const p: Record<string, any> = {
      q: debouncedSearchTerm || undefined,
      from: appliedFrom || undefined,
      to: appliedTo || undefined,
      limit: 50,
    };
    if (appliedCategoryIds && appliedCategoryIds.length > 0) {
      // server expects comma-separated categoryIds param (we added server support for categoryIds)
      p.categoryIds = appliedCategoryIds.join(",");
    }
    return p;
  }, [debouncedSearchTerm, appliedFrom, appliedTo, appliedCategoryIds]);

  const { data, isLoading, isError } = useExpenses(params);
  const deleteMutation = useDeleteExpense();
  const isDeleting = deleteMutation.status === "pending";

  // keep url in sync with applied filters + debounced q
  useEffect(() => {
    const qs = new URLSearchParams();
    if (debouncedSearchTerm) qs.set("q", debouncedSearchTerm);
    if (appliedCategoryIds && appliedCategoryIds.length > 0)
      qs.set("categoryIds", appliedCategoryIds.join(","));
    if (appliedFrom) qs.set("from", appliedFrom);
    if (appliedTo) qs.set("to", appliedTo);
    setSearchParams(qs, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, appliedCategoryIds, appliedFrom, appliedTo]);

  // category checkbox toggler
  const toggleCategory = (id: string) => {
    setWorkingCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleApply = () => {
    if (dateRangeInvalid) return;
    setAppliedCategoryIds(workingCategoryIds);
    setAppliedFrom(workingFrom || undefined);
    setAppliedTo(workingTo || undefined);
    setDrawerOpen(false);
  };

  const handleClear = () => {
    setWorkingCategoryIds([]);
    setWorkingFrom("");
    setWorkingTo("");
    setAppliedCategoryIds([]);
    setAppliedFrom(undefined);
    setAppliedTo(undefined);
    setDrawerOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  // Panel content (reused between desktop right column and mobile drawer)
  const FilterPanel = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Filters</h3>
        {!isDesktop && (
          <button
            aria-label="Close filters"
            onClick={() => setDrawerOpen(false)}
            className="p-1 rounded-md text-muted-foreground hover:bg-accent/10"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Categories multi-select */}
      <div className="mb-4">
        <div className="text-sm font-medium mb-2">Categories</div>
        <div className="flex flex-col max-h-48 overflow-auto pr-2">
          {categories.length === 0 ? (
            <div className="text-sm text-muted-foreground">No categories</div>
          ) : (
            categories.map((c) => {
              const checked = workingCategoryIds.includes(c.id);
              return (
                <label
                  key={c.id}
                  className="flex items-center gap-2 py-1 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={checked}
                    onChange={() => toggleCategory(c.id)}
                  />
                  <span className="text-sm">{c.name}</span>
                </label>
              );
            })
          )}
        </div>
      </div>

      {/* Date range */}
      <div className="mb-4">
        <div className="text-sm font-medium mb-2">Date range</div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={workingFrom}
            onChange={(e) => setWorkingFrom(e.target.value)}
            className="h-10 px-3 rounded-md border border-border/20 bg-background/50"
          />
          <input
            type="date"
            value={workingTo}
            onChange={(e) => setWorkingTo(e.target.value)}
            className="h-10 px-3 rounded-md border border-border/20 bg-background/50"
          />
        </div>
        {dateRangeInvalid && (
          <div className="text-sm text-destructive mt-2">
            Invalid range: from must be before or equal to to.
          </div>
        )}
      </div>

      <div className="mt-auto flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={handleClear}>
          Clear
        </Button>
        <Button
          className="flex-1"
          onClick={handleApply}
          disabled={dateRangeInvalid}
        >
          Apply
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">
            Manage and track your individual spending records.
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <div className="relative w-full sm:w-80 lg:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search description or category..."
              className="pl-9 bg-background/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* On desktop, keep a small filter button (toggles drawer on smaller screens).
              On large screens we still show the big right panel; the button also focuses panel */}
          <Button
            variant="outline"
            size="sm"
            className="rounded-full gap-2"
            onClick={() => {
              if (isDesktop) {
                // On desktop focus the filter area by opening nothing; we could toggle a highlight
                // For simplicity, open drawer for a11y/keyboard users as well
                setDrawerOpen((s) => !s);
              } else {
                setDrawerOpen(true);
              }
            }}
            aria-expanded={drawerOpen}
            aria-controls="expenses-filter-panel"
          >
            <Filter className="h-4 w-4" /> Filters
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="rounded-full gap-2"
            onClick={() => {
              /* TODO: export CSV */
            }}
          >
            <Download className="h-4 w-4" /> Export
          </Button>

          <Button asChild size="sm" className="rounded-full gap-2">
            <Link to={ROUTES.EXPENSES_NEW}>
              <Plus className="h-4 w-4" /> Add
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6">
        {/* Main content */}
        <Card className="border-border/40 bg-card/40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing results
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="rounded-xl border border-border/40 overflow-hidden">
              {isLoading ? (
                <div className="p-6 text-center">Loading expenses…</div>
              ) : isError ? (
                <div className="p-6 text-center text-destructive">
                  Failed to load expenses.
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data && data.data.length > 0 ? (
                      data.data.map((expense) => (
                        <TableRow
                          key={expense.id}
                          className="hover:bg-accent/5 transition-colors"
                        >
                          <TableCell className="text-sm font-medium text-muted-foreground">
                            {expense.date
                              ? new Date(expense.date).toLocaleDateString()
                              : ""}
                          </TableCell>
                          <TableCell className="font-medium">
                            {expense.description}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-3 rounded-full font-medium"
                            >
                              {expense.category ?? "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold font-mono">
                            {expense.currency === "USD" ? "$" : "₦"}
                            {expense.amount.toLocaleString()}
                          </TableCell>

                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                asChild
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:text-primary"
                              >
                                <Link to={ROUTES.EXPENSES_BY_ID(expense.id)}>
                                  <Pencil className="h-4 w-4" />
                                </Link>
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:text-destructive"
                                onClick={() => handleDelete(expense.id)}
                                disabled={isDeleting}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center p-6">
                          No expenses yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right-hand persistent panel for desktop */}
        {isDesktop ? (
          <aside id="expenses-filter-panel" className="sticky top-24 h-[70vh]">
            <div className="p-4 bg-card/40 border border-border/30 rounded-md h-full">
              {FilterPanel}
            </div>
          </aside>
        ) : (
          // Drawer for mobile/tablet
          <SlideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
            <div id="expenses-filter-panel">{FilterPanel}</div>
          </SlideDrawer>
        )}
      </div>
    </div>
  );
}
