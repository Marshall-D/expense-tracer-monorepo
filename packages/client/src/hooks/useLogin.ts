// packages/client/src/hooks/useLogin.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { loginApi } from "@/services";
import { useAuth } from "@/context/authProvider";
import type { LoginPayload, AuthResponse } from "@/types/auth";
import { queryKeys } from "@/lib/queryKeys";
import { t } from "@/lib/toast"; // <--- toast helper

/**
 * useLogin
 * - mutationFn: loginApi
 * - onSuccess: store auth in context/localStorage and prime/invalidates queries
 *
 * Returns the useMutation result so components can access mutateAsync/isLoading/etc.
 */
export function useLogin() {
  const qc = useQueryClient();
  const { setAuth } = useAuth();

  return useMutation<AuthResponse, Error, LoginPayload>({
    mutationFn: (payload: LoginPayload) => loginApi(payload),
    onSuccess(data) {
      setAuth(data.user, data.token);
      // prime `me`
      qc.setQueryData(queryKeys.me, data.user);
      // invalidate lists that depend on auth
      qc.invalidateQueries({ queryKey: queryKeys.expenses });
      qc.invalidateQueries({ queryKey: queryKeys.budgets });
      qc.invalidateQueries({ queryKey: queryKeys.categories });

      // show success toast (centralized)
      t.success("Signed in successfully");
    },
    onError(err: any) {
      // Optionally show a toast here as fallback (component also shows error).
      // Keep minimal here; component will show error toast with message.
      // t.error(err?.message ?? "Login failed");
    },
  });
}
