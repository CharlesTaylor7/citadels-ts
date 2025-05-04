import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

let db: ReturnType<typeof drizzle>;
export async function connect() {
  if (!db) {
    const volume = process.env["VOLUME"] ?? "./volume";
    const file = `${volume}/sqlite.db`;
    const pool = drizzle(file);
    try {
      migrate(pool, { migrationsFolder: "drizzle" });
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
    db = pool;
  }
  return db;
}
