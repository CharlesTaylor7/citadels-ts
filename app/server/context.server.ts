import { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { validateSessionToken } from "@/server/auth";
import { User, Game, db, room_members, games, rooms, Room } from "@/server/db";
import { eq } from "drizzle-orm";

export type Context = {
  user: User | null;
  room: Room | null;
  game: Game | null;
};

export async function createContext({ req }: CreateFastifyContextOptions) {
  return getContext(req);
}

export async function getContext(
  req: CreateFastifyContextOptions["req"],
): Promise<Context> {
  // Get session user if available
  const cookieHeader = req.headers.cookie || "";
  const cookies = cookieHeader.split("; ");
  const sessionCookie = cookies.find((cookie) => cookie.startsWith("session="));
  const sessionToken = sessionCookie ? sessionCookie.split("=")[1] : "";
  const user = await validateSessionToken(sessionToken);
  let room: Room | null = null;
  let game: Game | null = null;
  if (user) {
    const row = await db
      .select({ room: rooms, game: games })
      .from(room_members)
      .where(eq(room_members.playerId, user.id))
      .innerJoin(rooms, eq(rooms.id, room_members.roomId))
      .leftJoin(games, eq(games.id, rooms.gameId))
      .get();
    room = row?.room ?? null;
    game = row?.game ?? null;
  }
  return { user, room, game };
}
