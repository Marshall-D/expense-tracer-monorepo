// packages/client/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react"; // optional if React
import tailwindcss from "@tailwindcss/vite"; // official plugin

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
