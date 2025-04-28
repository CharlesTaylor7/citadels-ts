import { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { validateSessionToken } from "./auth.server";
import { User, Game, db, room_members, games } from "@/server/db.server";
import { eq } from "drizzle-orm";

export type Context = {
  user: User | null;
  game: Game | null;
};

export async function createContext({ req }: CreateFastifyContextOptions) {
  return getContext(req);
}

export async function getContext(
  req: CreateFastifyContextOptions["req"]
): Promise<Context> {
  // Get session user if available
  const cookieHeader = req.headers.cookie || "";
  const cookies = cookieHeader.split("; ");
  const sessionCookie = cookies.find((cookie) => cookie.startsWith("session="));
  const sessionToken = sessionCookie ? sessionCookie.split("=")[1] : "";
  const user = await validateSessionToken(sessionToken);
  let game: Game | null = null;
  if (user) {
    const row = await db
      .select({ game: games })
      .from(room_members)
      .where(eq(room_members.player_id, user.id))
      .leftJoin(games, eq(games.id, room_members.room_id))
      .get();
    game = row?.game ?? null;
  }
  return { user, game };
}
