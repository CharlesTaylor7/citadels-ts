import { z } from "zod";
import { t } from ".";
import { db, rooms, users, room_members, games } from "@/server/db";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { GameConfigUtils } from "@/game/lobby";
import { createGame } from "@/game/game-state";
import { invalidateAllSessions } from "@/server/auth";

export const authRouter = t.router({
  logout: t.procedure.mutation(async ({ ctx }) => {
    // expire cookie
    ctx.res.header(
      "Set-Cookie",
      "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly",
    );
    if (!ctx.session.user) return;
    await invalidateAllSessions(ctx.session.user.id);
  }),

  me: t.procedure.query(({ ctx }) => {
    return ctx.session;
  }),
});
