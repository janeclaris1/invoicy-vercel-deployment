import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Avoid Lightning CSS "Unsupported target" on Vercel (es2023 not supported by Lightning CSS)
    target: "es2022",
  },
});
