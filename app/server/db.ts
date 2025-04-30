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
  hashedPassword: text("hashed_password").notNull(),
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

// this ensures each player is in only 1 room at a time
export const room_members = table("room_members", {
  playerId: integer("player_id")
    .primaryKey()
    .references(() => users.id),
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id),
});
export const rooms = table("rooms", {
  id: text("id").primaryKey(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id),
  // json object of options
  options: text("options").notNull(),

  // multiple games can happen in the same room, just not at the same time
  gameId: integer("game_id").references(() => games.id),
});

export const games = table("games", {
  id: integer("id").primaryKey(),
  // json of the game state
  state: text("state").notNull(),
  // json array of actions
  // the current state should ideally be derivable by replaying all the actions
  actions: text("actions").notNull(),
});

export const tables = { users, sessions, games, rooms, room_members };

export type User = InferSelectModel<typeof users>;
export type Session = InferSelectModel<typeof sessions>;
export type Room = InferSelectModel<typeof rooms>;
export type Game = InferSelectModel<typeof games>;
