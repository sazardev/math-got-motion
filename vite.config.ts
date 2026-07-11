import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import checker from "vite-plugin-checker";
import Inspect from "vite-plugin-inspect";
import { visualizer } from "rollup-plugin-visualizer";
import { resolve } from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;
// @ts-expect-error process is a nodejs global
const isGithubPages = process.env.GITHUB_PAGES === "true";

export default defineConfig(async ({ mode }) => ({
  // GitHub Pages sirve el proyecto bajo /math-got-motion/, no en la raíz;
  // Tauri en cambio necesita la raíz ("/") porque carga el bundle desde su
  // propio protocolo local. Solo el workflow de Pages define esta env var.
  base: isGithubPages ? "/math-got-motion/" : "/",

  plugins: [
    react(),
    checker({
      typescript: {
        tsconfigPath: "./tsconfig.json",
      },
      eslint: {
        lintCommand: "eslint 'src/**/*.{ts,tsx}'",
      },
    }),
    Inspect(),
    visualizer({
      open: mode === "analyze",
      gzipSize: true,
      brotliSize: true,
      filename: "dist/stats.html",
    }),
  ],

  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },

  clearScreen: false,

  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },

  preview: {
    port: 1420,
    strictPort: true,
  },

  build: {
    target: "es2022",
    minify: mode === "production" ? "esbuild" : false,
    sourcemap: mode === "development" ? "inline" : false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          tauri: ["@tauri-apps/api"],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
}));
