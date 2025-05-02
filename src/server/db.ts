import { drizzle } from "drizzle-orm/libsql/node";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from "@libsql/client";
import { LibSQLDatabase } from "drizzle-orm/libsql/driver-core";

let db: LibSQLDatabase;
export async function connect() {
  if (!db) {
    const volume = process.env["VOLUME"] ?? "./volume";
    const client = createClient({
      url: `file:${volume}/sqlite.db`,
    });

    db = drizzle(client);
    await migrate(db, { migrationsFolder: "migrations" });
  }
  return db;
}
