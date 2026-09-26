import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  appType: "spa",
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/data": { target: "https://asmrhoney.com", changeOrigin: true },
      "/api": { target: "https://asmrhoney.com", changeOrigin: true },
      "/download": { target: "https://asmrhoney.com", changeOrigin: true },
    },
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
});
