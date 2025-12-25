import React, { useEffect, useState } from "react";

export default function App() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let mounted = true;

    const checkHealth = async () => {
      const base =
        // Vite env var (falls back to localhost)
        (import.meta as any).env?.VITE_API_URL ?? "http://localhost:3000";

      try {
        // const res = await fetch(`${base}/api/health`);
        const res = await fetch(
          `https://uphk9dlqh2.execute-api.us-east-1.amazonaws.com/api/health`
        );

        // If component unmounted while fetching, bail out
        if (!mounted) return;

        if (!res.ok) {
          setStatus("error");
          return;
        }

        const data = await res.json();
        setStatus(data?.status === "ok" ? "ok" : "error");
      } catch (err) {
        if (!mounted) return;
        setStatus("error");
      }
    };

    checkHealth();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 20 }}>
      <h1 className="text-sm font-bold">Expense tracker — smoke test</h1>
      <p className="text-blue-600">
        API health: <strong>{status}</strong>
      </p>{" "}
    </main>
  );
}
