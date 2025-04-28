import { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { validateSessionToken } from "./auth.server";

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  // Get session user if available
  const cookieHeader = req.headers.cookie || "";
  const cookies = cookieHeader.split("; ");
  const sessionCookie = cookies.find((cookie) => cookie.startsWith("session="));
  const sessionToken = sessionCookie ? sessionCookie.split("=")[1] : "";
  const session = await validateSessionToken(sessionToken);

  return {
    req,
    res,
    user: session?.user || null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
