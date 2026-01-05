/**
 * packages/client/src/pages/dashboard/dashboard.tsx
 *
 * Entry component — composes the data hook and presentational view.
 */

import React from "react";
import { DashboardView } from "./dashboardView";
import { useDashboardData } from "@/hooks";

/**
 * DashboardPage
 *
 * The exported page component used by routes. It delegates all fetching
 * and derivations to the hook and passes the resulting shape to the view.
 */
export function DashboardPage(): JSX.Element {
  const data = useDashboardData(6);
  return <DashboardView data={data} />;
}
