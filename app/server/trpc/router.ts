import { lobbyRouter } from "./lobby";
import { t } from "./index";
import { gameRouter } from "./game";

// Create a simple test router with a basic procedure
const testRouter = t.router({
  ping: t.procedure.query(() => {
    return 'pong';
  }),
});

// Merge all routers
export const appRouter = t.mergeRouters(
  testRouter,
  lobbyRouter,
  gameRouter
);

export type AppRouter = typeof appRouter;
