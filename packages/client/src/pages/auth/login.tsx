// packages/client/src/pages/auth/login.tsx

/**
 * LoginPage (container)
 *
 * - Uses the useLoginHandler hook to keep logic out of the view
 * - Renders the pure LoginView component
 */
import React from "react";
import { LoginView } from "./loginView";
import { useLoginHandler } from "@/hooks";

export function LoginPage(): JSX.Element {
  const { handleSubmit, isLoading, formError } = useLoginHandler();

  return (
    <LoginView
      onSubmit={handleSubmit}
      isLoading={isLoading}
      formError={formError}
    />
  );
}
