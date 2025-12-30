// packages/client/src/types/budget.ts

/**
 * Budget
 *
 * periodStart: ISO date string that identifies the month the budget applies to.
 *   - Preferred format for transport: full ISO like "2025-05-01T00:00:00.000Z"
 *   - UI-friendly input: you can accept "YYYY-MM" (type="month") and convert to "YYYY-MM-01"
 *   - The server will canonicalize it to the first day of the month at 00:00 UTC.
 *
 * categoryId: optional. null | undefined means "Uncategorized".
 * category: optional human-readable category name returned by the server (helpful for display).
 */
export type Budget = {
  id?: string;
  userId?: string | null;

  // categoryId may be null for uncategorized budgets
  categoryId?: string | null;

  // optional category name for display convenience (server returns this)
  category?: string | null;

  // canonical ISO string representing the budget month (first day of month, server-normalized)
  periodStart: string;

  // amount for the period (number, required)
  amount: number;

  // optional metadata
  createdAt?: string | null;
  updatedAt?: string | null;
};
