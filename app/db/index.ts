import { drizzle } from "drizzle-orm/libsql/node";

export const db = drizzle("volume/sqlite.db");
