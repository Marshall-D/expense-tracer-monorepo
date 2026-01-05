/**
 * packages/client/src/lib/number.ts
 *
 * Small, pure helpers for number / currency formatting used across the client.
 *
 */

export function formatNGN(value?: number | null): string {
  if (value === undefined || value === null) return "—";
  // show no decimal digits for big totals (matches prior behaviour)
  return `₦${new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

/**
 * More general formatter (with grouping & up to 2 decimals).
 * Useful for tooltips or smaller amounts.
 */
export function formatNGNWithDecimals(value?: number | null): string {
  if (value === undefined || value === null) return "—";
  return `₦${new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)}`;
}
