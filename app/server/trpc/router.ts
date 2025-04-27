import { lobbyRouter } from "./lobby";
import { t } from "./index";
import { gameRouter } from "./game";

export const appRouter = t.router({
  lobby: lobbyRouter,
  game: gameRouter,
});

export type AppRouter = typeof appRouter;
