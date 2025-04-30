import { defineConfig } from "drizzle-kit";
import { resolve } from "path";

export default defineConfig({
  dialect: "sqlite",
  schema: "./app/server/db.server.ts",
  dbCredentials: {
    url: "file:./volume/sqlite.db",
  },
  out: "./drizzle",
});
