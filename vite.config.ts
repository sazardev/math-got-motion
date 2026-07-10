import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import checker from "vite-plugin-checker";
import Inspect from "vite-plugin-inspect";
import { visualizer } from "rollup-plugin-visualizer";
import { resolve } from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async ({ mode }) => ({
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
