/**
 * packages/client/src/lib/api.ts
 *
 * Lightweight axios wrapper with:
 * - automatic Authorization header when token exists
 * - central 401 handling (clear auth state + redirect to login when appropriate)
 *
 */

import axios from "axios";

import { getToken, removeToken, removeUser } from "./storage";
import { ROUTES } from "@/utils";

const API_BASE = import.meta.env.VITE_API_BASE as string;

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

// handle 401 globally '
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      removeToken();
      removeUser();

      try {
        const reqUrl =
          (err && err.config && (err.config.url || err.config.baseURL || "")) ||
          "";

        const isAuthEndpoint =
          String(reqUrl).includes("/api/auth") ||
          String(reqUrl).includes("/auth") ||
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
        }
      } catch (inner) {}
    }
    return Promise.reject(err);
  }
);

export { api };
