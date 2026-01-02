// packages/client/src/context/authProvider.tsx

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getToken,
  getUser,
  removeToken,
  removeUser,
  setToken as storageSetToken,
  setUser as storageSetUser,
  queryKeys,
} from "@/lib";
import ROUTES from "@/utils/routes";
import { User, AuthContextValue } from "@/types/auth";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUserState] = useState<User>(() => getUser());
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const qc = useQueryClient();

  useEffect(() => {
    // when token/user changed in localStorage externally (other tabs), rehydrate
    const onStorage = () => {
      setUserState(getUser());
      setTokenState(getToken());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setAuth = (u: User, t: string) => {
    // update local state
    setUserState(u);
    setTokenState(t);

    // persist to localStorage (wrapped helpers)
    try {
      storageSetUser(u);
      storageSetToken(t);
    } catch {
      /* ignore storage errors */
    }

    // prime the "me" cache for convenience
    try {
      qc.setQueryData(queryKeys.me, u);
    } catch {
      // ignore
    }

    // invalidate auth-protected lists so they refetch under new user
    try {
      qc.invalidateQueries({ queryKey: queryKeys.expenses });
      qc.invalidateQueries({ queryKey: queryKeys.budgets });
      qc.invalidateQueries({ queryKey: queryKeys.categories });
    } catch {
      // fail-safe
    }
  };

  const logout = () => {
    // clear in-memory state
    setUserState(null);
    setTokenState(null);

    // clear storage (helpers)
    try {
      removeToken();
      removeUser();
      // also double-ensure via localStorage directly in case helpers fail
      try {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
      } catch {}
    } catch {
      /* ignore storage errors */
    }

    // clear query cache so protected data isn't shown accidentally
    try {
      qc.clear();
    } catch {
      /* ignore */
    }

    // hard redirect to login so app resets to public state.
    // Use replace() so the protected page is removed from history (prevents back-button revealing cached UI).
    try {
      window.location.replace(ROUTES.LOGIN);
    } catch {
      window.location.assign(ROUTES.LOGIN);
    }
  };

  const value = useMemo(
    () => ({
      user,
      token,
      // explicit boolean (true only when token present)
      isAuthenticated: Boolean(token),
      setAuth,
      logout,
    }),
    [user, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
