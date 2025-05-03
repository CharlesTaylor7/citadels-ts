import { t } from ".";
import { z } from "zod";
import { users } from "@/server/schema";
import { eq } from "drizzle-orm";
import {
  invalidateAllSessions,
  hashPassword,
  generateSessionToken,
  createSession,
  verifyPasswordStrength,
  verifyPasswordHash,
} from "@/server/auth";

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

  signup: t.procedure
    .input(
      z.object({
        username: z.string().min(8),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ input, ctx: { db, responseHeaders } }) => {
      // Check if username already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.username, input.username))
        .get();

      if (existingUser) {
        return { success: false, error: "Username already taken" };
      }

      // Verify password strength
      const isStrongPassword = await verifyPasswordStrength(input.password);
      if (!isStrongPassword) {
        return {
          success: false,
          error: "Password is too weak or has been compromised",
        };
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(input.password);
      const result = await db
        .insert(users)
        .values({
          username: input.username,
          hashedPassword,
        })
        .returning()
        .get();

      // Create session
      const token = generateSessionToken();
      await createSession(token, result.id);

      // Set session cookie
      responseHeaders.set(
        "Set-Cookie",
        `session=${token}; Path=/; HttpOnly; SameSite=Lax`
      );

      return { success: true };
    }),

  login: t.procedure
    .input(
      z.object({
        username: z.string().min(8),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ input, ctx: { db, responseHeaders } }) => {
      // Find user
      const user = await db
        .select()
        .from(users)
        .where(eq(users.username, input.username))
        .get();

      if (!user) {
        return { success: false, error: "Invalid username or password" };
      }

      // Verify password
      const isValidPassword = await verifyPasswordHash(
        user.hashedPassword,
        input.password
      );

      if (!isValidPassword) {
        return { success: false, error: "Invalid username or password" };
      }

      // Create session
      const token = generateSessionToken();
      await createSession(token, user.id);

      // Set session cookie
      responseHeaders.set(
        "Set-Cookie",
        `session=${token}; Path=/; HttpOnly; SameSite=Lax`
      );

      return { success: true };
    }),
});
