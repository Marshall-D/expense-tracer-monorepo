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
      // navigate to login page (hard redirect so the app resets). Use replace to prevent back-nav showing protected page.
      try {
        window.location.replace(ROUTES.LOGIN);
      } catch {
        try {
          window.location.href = ROUTES.LOGIN;
        } catch {
          // ignore
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;
