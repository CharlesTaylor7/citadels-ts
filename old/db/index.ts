import { drizzle } from "drizzle-orm/libsql/node";
import { createClient } from "@libsql/client";

// Create a client with the correct URL format
const client = createClient({
  url: "file:./volume/sqlite.db",
});

export const db = drizzle(client);
