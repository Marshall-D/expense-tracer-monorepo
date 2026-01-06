// packages/client/src/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";

import "./global.css";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import App from "./App";

import { AuthProvider } from "./context";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 8000,
            style: {
              padding: "10px 14px",
              borderRadius: "12px",
              background: "var(--card)", // adjusts to your theme tokens
              color: "var(--foreground)",
              boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);
