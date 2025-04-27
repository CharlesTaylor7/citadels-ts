import { drizzle } from "drizzle-orm/libsql/node";
import { createClient } from "@libsql/client";

// Create a client with the correct URL format
const client = createClient({
  url: "file:./volume/sqlite.db",
});

export const db = drizzle(client);

import { sqliteTable as table, text, integer } from "drizzle-orm/sqlite-core";
import type { InferSelectModel } from "drizzle-orm";

export const users = table("users", {
  id: integer("id").primaryKey(),
  username: text("username").notNull().unique(),
  hashed_password: text("hashed_password").notNull(),
});

export const sessions = table("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: integer("expires_at", {
    mode: "timestamp",
  }).notNull(),
});

export const room_members = table("room_members", {
  player_id: text("player_id")
    .primaryKey()
    .references(() => users.id),
  room_id: text("room_id")
    .notNull()
    .references(() => rooms.id),
});
export const rooms = table("rooms", {
  id: text("id").primaryKey(),
  owner_id: text("owner_id")
    .notNull()
    .references(() => users.id),
  // json object of options
  options: text("options").notNull(),
});

export const games = table("games", {
  id: text("id")
    .primaryKey()
    .references(() => rooms.id),
  // json of the game state
  state: text("state").notNull(),
  // json array of actions
  actions: text("actions").notNull(),
});

export type User = InferSelectModel<typeof users>;
export type Session = InferSelectModel<typeof sessions>;
export type Room = InferSelectModel<typeof rooms>;
export type Game = InferSelectModel<typeof games>;
