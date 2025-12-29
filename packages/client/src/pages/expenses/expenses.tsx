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

/** Small debounce hook used for search input */
function useDebouncedValue<T>(value: T, delayMs = 300) {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/** Small media query hook — avoids adding react-use dependency */
function useMediaQuery(query: string) {
  const getMatches = () =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false;
  const [matches, setMatches] = useState<boolean>(getMatches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = () => setMatches(mq.matches);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

/** Simple slide drawer (mobile) */
function SlideDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-50 transition-all ${
        open ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        aria-modal="true"
        role="dialog"
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
  // URL state
  const [searchParams, setSearchParams] = useSearchParams();

  // initial values from URL (applied filters)
  const initialQ = searchParams.get("q") || "";
  const initialCategoryIds = (searchParams.get("categoryIds") || "")
    .split(",")
    .filter(Boolean);
  const initialFrom = searchParams.get("from") || "";
  const initialTo = searchParams.get("to") || "";

  // search
  const [searchTerm, setSearchTerm] = useState(initialQ);
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  // categories
  const { data: categories = [] } = useCategories(true);

  // responsiveness
  const isDesktop = useMediaQuery("(min-width: 1024px)"); // lg breakpoint in tailwind

  // drawer open (mobile/tablet)
  const [drawerOpen, setDrawerOpen] = useState(false);

  // working filters (user edits)
  const [workingCategoryIds, setWorkingCategoryIds] =
    useState<string[]>(initialCategoryIds);
  const [workingFrom, setWorkingFrom] = useState(initialFrom);
  const [workingTo, setWorkingTo] = useState(initialTo);

  // applied filters (actually used to query)
  const [appliedCategoryIds, setAppliedCategoryIds] =
    useState<string[]>(initialCategoryIds);
  const [appliedFrom, setAppliedFrom] = useState<string | undefined>(
    initialFrom || undefined
  );
  const [appliedTo, setAppliedTo] = useState<string | undefined>(
    initialTo || undefined
  );

  // keep searchTerm in sync if URL changed externally
  useEffect(() => {
    setSearchTerm(initialQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // date validation
  const dateRangeInvalid =
    Boolean(workingFrom && workingTo) && workingFrom > workingTo;

  // build query params for useExpenses
  const params = useMemo(() => {
    const p: Record<string, any> = {
      q: debouncedSearchTerm || undefined,
      from: appliedFrom || undefined,
      to: appliedTo || undefined,
      limit: 50,
    };
    if (appliedCategoryIds && appliedCategoryIds.length > 0) {
      p.categoryIds = appliedCategoryIds.join(",");
    }
    return p;
  }, [debouncedSearchTerm, appliedFrom, appliedTo, appliedCategoryIds]);

  const { data, isLoading, isError } = useExpenses(params);
  const deleteMutation = useDeleteExpense();
  const isDeleting = deleteMutation.status === "pending";

  // push applied filters + q into URL (shareable)
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

  // helpers
  const toggleCategory = (id: string) =>
    setWorkingCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

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

  // Filter panel markup (re-used for desktop aside and mobile drawer)
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
      {/* HEADER: Title & actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">
            Manage and track your individual spending records.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full gap-2 bg-transparent"
            onClick={() => {
              // TODO: export CSV
            }}
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>

          <Button asChild size="sm" className="rounded-full gap-2">
            <Link to={ROUTES.EXPENSES_NEW}>
              <Plus className="h-4 w-4" /> Add New
            </Link>
          </Button>
        </div>
      </div>

      {/* SEARCH + FILTER ROW */}
      <div className="w-full">
        {/* For large screens: show single search bar full width (filter panel visible on right) */}
        {isDesktop ? (
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search description or category..."
              className="pl-9 bg-background/50 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        ) : (
          // For mobile/tablet: search and filter button share equal width
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-9 bg-background/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-10 rounded-md flex items-center justify-center gap-2"
                onClick={() => setDrawerOpen(true)}
                aria-expanded={drawerOpen}
                aria-controls="expenses-filter-panel"
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* MAIN GRID: left = table, right = persistent filter (desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6">
        {/* LEFT: main table */}
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

        {/* RIGHT: persistent filter panel on desktop */}
        {isDesktop ? (
          <aside
            id="expenses-filter-panel"
            className="sticky top-24 h-[70vh] overflow-y-auto"
          >
            <div className="p-4 bg-card/40 border border-border/30 rounded-md h-full">
              {FilterPanel}
            </div>
          </aside>
        ) : null}
      </div>

      {/* Mobile/Tablet Drawer */}
      {!isDesktop && (
        <SlideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <div id="expenses-filter-panel">{FilterPanel}</div>
        </SlideDrawer>
      )}
    </div>
  );
}
