import { t } from "./index";
import { lobbyRouter } from "./lobby";
import { gameRouter } from "./game";
import { authRouter } from "./auth";

// Merge all routers
export const appRouter = t.router({
  lobby: lobbyRouter,
  game: gameRouter,
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
