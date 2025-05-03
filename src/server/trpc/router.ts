import { router } from "./index";
import { lobbyRouter } from "./lobby";
import { gameRouter } from "./game";
import { authRouter } from "./auth";
import { dashboardRouter } from "./dashboard";

// Merge all routers
export const appRouter = router({
  lobby: lobbyRouter,
  game: gameRouter,
  auth: authRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
