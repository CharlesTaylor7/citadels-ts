import { validateSessionToken } from "@/server/auth";
import { User, Game, Room, room_members, games, rooms } from "@/server/schema";
import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { eq } from "drizzle-orm";
import { connect } from "@/server/db";

export type Context = {
  request: unknown;
  responseHeaders: unknown;
  session: UserSession;
  db: Awaited<ReturnType<typeof connect>>;
};

export type UserSession = {
  user: User | null;
  room: Room | null;
  game: Game | null;
};

export async function createContext({
  req,
  resHeaders,
}: FetchCreateContextFnOptions) {
  const db = await connect();
  const session = await getUserSession(db, req);
  return { db, session, request: req, responseHeaders: resHeaders };
}

export async function getUserSession(
  db: Context["db"],
  req: FetchCreateContextFnOptions["req"],
): Promise<UserSession> {
  // Get session user if available
  const sessionCookie = req.headers
    .getSetCookie()
    .flatMap((cookie) => cookie.split("; "))
    .find((cookie) => cookie.startsWith("session="));
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
