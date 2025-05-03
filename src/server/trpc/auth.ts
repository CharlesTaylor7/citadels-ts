import { t } from ".";
import { invalidateAllSessions } from "@/server/auth";

type Me = {
  id: string;
  name: string;
  roomId?: string;
  gameId?: string;
};
export const authRouter = t.router({
  logout: t.procedure.mutation(
    async ({ ctx: { session, responseHeaders } }) => {
      // expire cookie
      responseHeaders.set(
        "Set-Cookie",
        "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly"
      );
      if (!session.user) return;
      await invalidateAllSessions(session.user.id);
    }
  ),

  me: t.procedure.query(({ ctx }) => {
    return ctx.session;
  }),
});
