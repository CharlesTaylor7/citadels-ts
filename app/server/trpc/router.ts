import { lobbyRouter } from "./lobby";
import { t } from "./index";
import { gameRouter } from "./game";

export const appRouter = t.mergeRouters(lobbyRouter, gameRouter);

export type AppRouter = typeof appRouter;
