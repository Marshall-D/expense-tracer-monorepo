// packages/client/src/lib/api.ts

import axios from "axios";
import { getToken, removeToken, removeUser } from "./storage";
import ROUTES from "@/utils/routes";

const API_BASE =
  (import.meta.env.VITE_API_BASE as string) || "http://localhost:3000";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

// attach token
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// handle 401 globally (best-effort). We cannot import React router here, so do a safe fallback:
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      // clear local auth state — AuthProvider will rehydrate from storage on next load
      removeToken();
      removeUser();

      // Decide whether to perform a hard redirect to the login page.
      // We SHOULD NOT redirect if the failing request is itself the login/auth endpoint
      // (because that would cause the login page to reload on invalid credentials).
      // Also avoid redirecting if we're already on the login page.
      try {
        const reqUrl =
          (err && err.config && (err.config.url || err.config.baseURL || "")) ||
          "";

        const isAuthEndpoint =
          String(reqUrl).includes("/api/auth") ||
          String(reqUrl).includes("/auth") ||
          // also allow for common paths; tweak if your auth route is different
          false;

        const alreadyOnLogin =
          typeof window !== "undefined" &&
          window.location &&
          window.location.pathname === ROUTES.LOGIN;

        // Only redirect when NOT an auth/login request and NOT already on login page.
        if (!isAuthEndpoint && !alreadyOnLogin) {
          try {
            window.location.replace(ROUTES.LOGIN);
          } catch {
            try {
              window.location.href = ROUTES.LOGIN;
            } catch {
              // ignore
            }
          }
        } else {
          // If this was an auth endpoint (e.g. login failed) or we're already on /login,
          // do not navigate — let the calling screen handle the error and show toasts.
          // We still cleared token/user above so state is consistent.
        }
      } catch (inner) {
        // Fallback: don't crash; we've already removed tokens above.
      }
    }
    return Promise.reject(err);
  }
);

export { api };
