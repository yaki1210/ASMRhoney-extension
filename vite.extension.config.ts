import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    preact(),
    {
      name: "copy-extension-meta",
      closeBundle() {
        const out = resolve(root, "dist-ext");
        const icons = resolve(out, "icons");
        mkdirSync(icons, { recursive: true });
        copyFileSync(resolve(root, "manifest.json"), resolve(out, "manifest.json"));
        copyFileSync(resolve(root, "rules.json"), resolve(out, "rules.json"));
        for (const name of readdirSync(resolve(root, "assets/ext"))) {
          copyFileSync(resolve(root, "assets/ext", name), resolve(icons, name));
        }
      },
    },
  ],
  build: {
    outDir: resolve(root, "dist-ext"),
    emptyOutDir: true,
    cssCodeSplit: false,
    sourcemap: false,
    lib: {
      entry: resolve(root, "src/content/inject.ts"),
      name: "AHX",
      formats: ["iife"],
      fileName: () => "content.js",
    },
    rollupOptions: {
      output: {
        assetFileNames: "content.css",
        inlineDynamicImports: true,
      },
    },
  },
});
