import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [
    preact(),
    {
      name: "copy-extension-meta",
      closeBundle() {
        mkdirSync("dist-ext", { recursive: true });
        copyFileSync("manifest.json", "dist-ext/manifest.json");
        copyFileSync("rules.json", "dist-ext/rules.json");
      },
    },
  ],
  build: {
    outDir: "dist-ext",
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: resolve(__dirname, "src/content/inject.ts"),
      name: "AHX",
      formats: ["iife"],
      fileName: () => "content.js",
    },
    rollupOptions: {
      output: {
        assetFileNames: "content.css",
      },
    },
  },
});
