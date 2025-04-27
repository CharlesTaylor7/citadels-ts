import { sqliteTable as table, text, integer } from "drizzle-orm/sqlite-core";
import type { InferSelectModel } from "drizzle-orm";

export const users = table("users", {
  id: integer("id").primaryKey(),
  username: text("username").notNull().unique(),
  hashed_password: text("hashed_password").notNull(),
});

export const sessions = table("sessions", {
  id: text("id").primaryKey(),
  // nullable. guest users can spectate without playing
  userId: integer("user_id").references(() => users.id),
  expiresAt: integer("expires_at", {
    mode: "timestamp",
  }).notNull(),
});

export const rooms = table("rooms", {
  id: text("id").primaryKey(),
  owner: text("owner")
    .notNull()
    .references(() => users.id),
  // csv of player ids, in turn order
  players: text("players").notNull(),
  // json of options
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
