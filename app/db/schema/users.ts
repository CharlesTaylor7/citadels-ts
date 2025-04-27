import { sqliteTable as table, text, integer } from "drizzle-orm/sqlite-core";

export const users = table("users", {
  id: integer("id").primaryKey(),
  username: text("username").notNull().unique(),
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
