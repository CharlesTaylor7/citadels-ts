import { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { getSession } from "./auth.server";

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  // Get session user if available
  const session = await getSession(req);
  
  return { 
    req, 
    res, 
    user: session?.user || null 
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
