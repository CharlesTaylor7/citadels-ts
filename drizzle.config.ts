import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  url: "volume/sqlite.db",
  schema: "./app/db/schema.ts",
});
