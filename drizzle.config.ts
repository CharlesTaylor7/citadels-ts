import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./app/server/db.ts",
  dbCredentials: {
    url: "file:./volume/sqlite.db",
  },
  out: "./drizzle",
});
