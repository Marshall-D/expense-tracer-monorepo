// packages/client/src/pages/auth/register.tsx

/**
 * RegisterPage (container)
 *
 * - Uses the useRegisterHandler hook to keep logic out of the view
 * - Renders the pure RegisterView component
 */

import React from "react";
import { RegisterView } from "./registerView";
import { useRegisterHandler } from "@/hooks";

export function RegisterPage(): JSX.Element {
  const { handleSubmit, isLoading, formError } = useRegisterHandler();

  return (
    <RegisterView
      onSubmit={handleSubmit}
      isLoading={isLoading}
      formError={formError}
    />
  );
}
