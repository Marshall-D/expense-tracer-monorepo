// packages/client/src/components/ProtectedRoute.tsx

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context";
import { ROUTES } from "@/utils";

/**
 * Protects children routes from unauthenticated access.
 * - Accepts ReactNode (more flexible than ReactElement).
 * - Stores the attempted location in navigation state so you can redirect back after login if desired.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // If not authenticated, redirect to login and preserve attempted URL in state
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
