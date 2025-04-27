import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    port: 3000,
  },
  optimizeDeps: {
    exclude: ["@oslojs/crypto", "@oslojs/encoding"],
  },
  build: {
    rollupOptions: isSsrBuild
      ? {
          input: "./server/app.server.ts",
        }
      : undefined,
  },
}));
