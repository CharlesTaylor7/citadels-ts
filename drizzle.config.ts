import { defineConfig } from "drizzle-kit";

const volume = process.env["VOLUME"] ?? "./volume";
export default defineConfig({
  dialect: "sqlite",
  schema: "./app/server/db.ts",
  dbCredentials: {
    url: `file:${volume}/sqlite.db`,
  },
  out: "./drizzle",
});
