import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/route-tree.ts",
      enableRouteTreeFormatting: false,
      enableRouteGeneration: false,
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  server: {
    port: 3000,
  },

  build: {
    manifest: true,
    rollupOptions: {
      input: "./src/server/start.server.ts",
    },
  },
  optimizeDeps: {
    exclude: ["@oslojs/crypto", "@oslojs/encoding"],
  },
});
