import { defineConfig } from "drizzle-kit";
import { resolve } from "path";

export default defineConfig({
  dialect: "sqlite",
  schema: "./app/db/schema.ts",
  dbCredentials: {
    url: "file:../../volume/sqlite.db",
  },
  out: "./drizzle",
});
