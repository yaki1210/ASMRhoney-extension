import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

const originProxy = {
  "/data": { target: "https://asmrhoney.com", changeOrigin: true },
  "/api": { target: "https://asmrhoney.com", changeOrigin: true },
  "/download": { target: "https://asmrhoney.com", changeOrigin: true },
  "/icons": { target: "https://asmrhoney.com", changeOrigin: true },
};

export default defineConfig({
  plugins: [preact()],
  appType: "spa",
  server: {
    port: 5173,
    strictPort: true,
    proxy: originProxy,
  },
  preview: {
    port: 5173,
    strictPort: true,
    proxy: originProxy,
  },
});
