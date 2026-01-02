// packages/client/src/hooks/useRegister.ts
import {
  useMutation,
  useQueryClient,
  UseMutationResult,
} from "@tanstack/react-query";
import { registerApi } from "@/services";
import { useAuth } from "@/context/authProvider";
import type { RegisterPayload, AuthResponse } from "@/types/auth";
import { t } from "@/lib/toast";

/**
 * useRegister
 * - returns a properly typed mutation result
 */
export function useRegister(): UseMutationResult<
  AuthResponse,
  Error,
  RegisterPayload,
  unknown
> {
  const qc = useQueryClient();
  const { setAuth } = useAuth();

  return useMutation<AuthResponse, Error, RegisterPayload>({
    mutationFn: (payload: RegisterPayload) => registerApi(payload),
    onSuccess(data) {
      setAuth(data.user, data.token);
      qc.setQueryData(["me"], data.user);

      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["categories"] });

      // show welcome toast on successful registration/login
      const name = (data && data.user && (data.user as any).name) || "there";
      t.success(`Welcome, ${name}!`);
    },
  });
}
