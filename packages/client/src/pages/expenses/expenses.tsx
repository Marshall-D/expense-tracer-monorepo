// packages/client/src/pages/expenses/expenses.tsx
import React, { Suspense, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  Badge,
  InfoModal,
  Table,
  Card,
  CardContent,
  CardHeader,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  Input,
  TableRow,
  Button,
} from "@/components";
import {
  Search,
  Filter,
  Plus,
  Pencil,
  Trash2,
  Download,
  X,
} from "lucide-react";
import { ROUTES } from "@/utils";
import {
  useExpenses,
  useDeleteExpense,
  useCategories,
  useExportExpenses,
} from "@/hooks";
import { format } from "date-fns";
import { t } from "@/lib";

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

export function ExpensesPageWrapper() {
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
  const initialPage = Number(searchParams.get("page") || "1");

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

  // pagination state
  const [page, setPage] = useState<number>(initialPage || 1);
  const limit = 50; // fixed page size for UI; backend caps at 100

  // Reset page to 1 whenever filters/search change
  useEffect(() => {
    setPage(1);
  }, [
    appliedCategoryIds.join(","),
    appliedFrom,
    appliedTo,
    debouncedSearchTerm,
  ]);

  // date validation (only meaningful when both dates present)
  const dateRangeInvalid =
    Boolean(workingFrom && workingTo) && workingFrom > workingTo;

  // build query params for useExpenses
  const params = useMemo(() => {
    const p: Record<string, any> = {
      q: debouncedSearchTerm || undefined,
      from: appliedFrom || undefined,
      to: appliedTo || undefined,
      limit,
      page,
    };
    if (appliedCategoryIds && appliedCategoryIds.length > 0) {
      p.categoryIds = appliedCategoryIds.join(",");
    }
    return p;
  }, [debouncedSearchTerm, appliedFrom, appliedTo, appliedCategoryIds, page]);

  const { data, isLoading, isError, isFetching } = useExpenses(params);
  const deleteMutation = useDeleteExpense();
  const isDeleting = deleteMutation.status === "pending";

  // state for deletion modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // push applied filters + q + page into URL (shareable)
  useEffect(() => {
    const qs = new URLSearchParams();
    if (debouncedSearchTerm) qs.set("q", debouncedSearchTerm);
    if (appliedCategoryIds && appliedCategoryIds.length > 0)
      qs.set("categoryIds", appliedCategoryIds.join(","));
    if (appliedFrom) qs.set("from", appliedFrom);
    if (appliedTo) qs.set("to", appliedTo);
    if (page && page > 1) qs.set("page", String(page));
    setSearchParams(qs, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, appliedCategoryIds, appliedFrom, appliedTo, page]);

  // helpers
  const toggleCategory = (id: string) =>
    setWorkingCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // Apply handler with strict validation: either both from+to empty OR both filled.
  const handleApply = () => {
    // If only one is filled -> error (user requested this behavior)
    const fromSet = Boolean(workingFrom && workingFrom.trim());
    const toSet = Boolean(workingTo && workingTo.trim());
    if ((fromSet && !toSet) || (!fromSet && toSet)) {
      t.error("Please fill both From and To, or leave both empty.");
      return;
    }

    // If both set check ordering
    if (fromSet && toSet && workingFrom! > workingTo!) {
      t.error("Invalid range: 'From' must be before or equal to 'To'.");
      return;
    }

    // commit filters
    setAppliedCategoryIds(workingCategoryIds);
    setAppliedFrom(workingFrom || undefined);
    setAppliedTo(workingTo || undefined);
    setDrawerOpen(false);

    // success toast
    t.success("Filters applied");
  };

  const handleClear = () => {
    setWorkingCategoryIds([]);
    setWorkingFrom("");
    setWorkingTo("");
    setAppliedCategoryIds([]);
    setAppliedFrom(undefined);
    setAppliedTo(undefined);
    setDrawerOpen(false);
    // show success toast for clarity
    t.success("Filters cleared");
  };

  // open modal when user clicks delete; show modal instead of confirm()
  const requestDelete = (id: string) => {
    setDeleteTargetId(id);
    setDeleteModalOpen(true);
  };

  const performDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteMutation.mutateAsync(deleteTargetId);
      t.success("Expense deleted");
    } catch (err: any) {
      // hook shows a toast; we add fallback
      const msg = err?.message ?? "Delete failed";
      t.error(msg);
    } finally {
      setDeleteModalOpen(false);
      setDeleteTargetId(null);
    }
  };

  // ------------------- Export CSV wiring -------------------
  const exportMutation = useExportExpenses();
  const isExporting = exportMutation.status === "pending";

  function defaultRange() {
    const today = new Date();
    const to = format(today, "yyyy-MM-dd");
    const fromDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
    const from = format(fromDate, "yyyy-MM-dd");
    return { from, to };
  }

  function fallbackFileName(fromStr: string, toStr: string) {
    return `expenses_${fromStr}_${toStr}.csv`;
  }

  const handleExport = async () => {
    const { from: defFrom, to: defTo } = defaultRange();
    const from = appliedFrom || defFrom;
    const to = appliedTo || defTo;

    try {
      const resp = await exportMutation.mutateAsync({ from, to });

      const respData = (resp as any)?.data ?? resp;
      const headers = (resp as any)?.headers ?? {};

      let blob: Blob;
      if (respData instanceof Blob) {
        blob = respData;
      } else if (
        respData &&
        typeof respData === "object" &&
        respData.constructor?.name === "ArrayBuffer"
      ) {
        blob = new Blob([respData], {
          type: headers["content-type"] ?? "text/csv",
        });
      } else if (typeof respData === "string") {
        blob = new Blob([respData], {
          type: headers["content-type"] ?? "text/csv",
        });
      } else {
        blob = new Blob([JSON.stringify(respData)], {
          type: "application/json",
        });
      }

      const url = window.URL.createObjectURL(blob);

      const disp =
        headers["content-disposition"] ||
        headers["Content-Disposition"] ||
        undefined;

      let fileName = fallbackFileName(from, to);
      if (typeof disp === "string") {
        const m = disp.match(/filename="(.+)"/);
        if (m && m[1]) fileName = m[1];
        else {
          const m2 = disp.match(/filename\*=UTF-8''(.+)/i);
          if (m2 && m2[1]) fileName = decodeURIComponent(m2[1]);
        }
      }

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      t.success("CSV downloaded");
    } catch (err: any) {
      console.error("Export failed", err);
      t.error("Export failed");
      if (err?.response?.data) {
        try {
          const d = err.response.data;
          if (d instanceof Blob) {
            const text = await d.text();
            console.error("Server error body:", text);
          } else {
            console.error("Server error body:", d);
          }
        } catch (e) {
          // ignore
        }
      }
    }
  };
  // ---------------------------------------------------------

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

      {/* DATE RANGE (stacked vertically with headers) */}
      <div className="mb-4">
        <div className="text-sm font-medium mb-2">Date range</div>

        <div className="flex flex-col gap-2">
          <div>
            <div className="text-xs font-medium mb-1">From</div>
            <input
              type="date"
              value={workingFrom}
              onChange={(e) => setWorkingFrom(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border/20 bg-background/50"
            />
          </div>

          <div>
            <div className="text-xs font-medium mb-1">To</div>
            <input
              type="date"
              value={workingTo}
              onChange={(e) => setWorkingTo(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border/20 bg-background/50"
            />
          </div>
        </div>

        {dateRangeInvalid && (
          <div className="text-sm text-destructive mt-2">
            Invalid range: from must be before or equal to to.
          </div>
        )}
      </div>

      <div className="mt-auto flex gap-2">
        <Button
          variant="ghost"
          className="flex-1 rounded-md border border-border/20"
          onClick={handleClear}
        >
          Clear
        </Button>
        <Button
          className="flex-1 rounded-md"
          onClick={handleApply}
          // disable only when both dates present and invalid ordering; single-date validation handled in handler
          disabled={Boolean(
            workingFrom && workingTo && workingFrom > workingTo
          )}
        >
          Apply
        </Button>
      </div>
    </div>
  );

  // Helpers for result summary & pagination controls
  const total = data?.total ?? 0;
  const currentPage = data?.page ?? page;
  const currentLimit = data?.limit ?? limit;
  const startIndex = total === 0 ? 0 : (currentPage - 1) * currentLimit + 1;
  const endIndex = total === 0 ? 0 : startIndex + (data?.data?.length ?? 0) - 1;
  const hasPrev = currentPage > 1;
  const hasNext = endIndex < total;

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
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="h-4 w-4" />{" "}
            {isExporting ? "Downloading…" : "Export CSV"}
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

      {/* MAIN LIST */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <Card className="border-border/40 bg-card/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {isLoading || isFetching ? (
                    <span>Loading results…</span>
                  ) : total === 0 ? (
                    <span>No expenses yet.</span>
                  ) : (
                    <span>
                      Showing {startIndex}–{endIndex} of {total}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground">
                    Page {currentPage}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="rounded-xl border border-border/40 overflow-hidden">
                {isLoading && !data ? (
                  <div className="p-6 text-center">Loading expenses…</div>
                ) : isError ? (
                  <div className="p-6 text-center text-destructive">
                    Failed to load expenses.
                  </div>
                ) : (
                  <>
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
                                    <Link
                                      to={ROUTES.EXPENSES_BY_ID(expense.id)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Link>
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:text-destructive"
                                    onClick={() => requestDelete(expense.id)}
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

                    {/* Pagination controls */}
                    <div className="p-4 flex items-center justify-between border-t border-border/30 bg-muted/5">
                      <div className="text-xs text-muted-foreground">
                        {total === 0
                          ? ""
                          : `Showing ${startIndex}–${endIndex} of ${total}`}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={!hasPrev || isFetching}
                        >
                          Prev
                        </Button>

                        <div className="text-sm">{currentPage}</div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPage((p) => p + 1)}
                          disabled={!hasNext || isFetching}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: persistent filter panel on desktop (fixed width lg:w-80 = 320px) */}
        {isDesktop ? (
          <aside
            id="expenses-filter-panel"
            className="lg:w-80 w-full sticky top-24 h-[70vh] overflow-y-auto"
          >
            {/* sharper / more visible border radius and border weight */}
            <div className="p-4 bg-card/40 border-2 border-border/40 rounded-lg h-full">
              {FilterPanel}
            </div>
          </aside>
        ) : null}
      </div>

      {/* Delete confirmation modal */}
      <InfoModal
        open={deleteModalOpen}
        title="Delete expense?"
        message="This action will permanently delete the expense. Are you sure?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={isDeleting}
        onCancel={() => {
          setDeleteModalOpen(false);
          setDeleteTargetId(null);
        }}
        onConfirm={performDelete}
      />

      {/* Mobile/Tablet Drawer */}
      {!isDesktop && (
        <SlideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <div
            id="expenses-filter-panel"
            // mobile drawer: keep same visible border radius inside drawer
            className="p-2"
          >
            <div className="p-4 bg-card/40 border-2 border-border/40 rounded-lg h-full">
              {FilterPanel}
            </div>
          </div>
        </SlideDrawer>
      )}
    </div>
  );
}
