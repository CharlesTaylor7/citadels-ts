import {
  fastifyTRPCPlugin,
  FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";
import { reactRouterFastify } from "@mcansh/remix-fastify/react-router";
import fastify from "fastify";
import { createContext, getContext } from "./context.server";
import { appRouter, type AppRouter } from "@/server/trpc/router";

export const server = fastify({
  maxParamLength: 5000,
});
server.register(fastifyTRPCPlugin, {
  useWSS: true,
  keepAlive: {
    enabled: true,
    pingMs: 30_000,
    pongWaitMs: 5_000,
  },
  prefix: "/trpc",
  trpcOptions: {
    router: appRouter,
    createContext,
    onError({ path, error }) {
      // report to error monitoring
      console.error(`Error in tRPC handler on path '${path}':`, error);
    },
  } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
});

server.register(reactRouterFastify);
server.get("/ping", (req, res) => {
  res.send("pong");
});

server.addHook("onRequest", async (req, res) => {
  req.context = await getContext(req);
  if (req.context.user == null) res.redirect("/login");
  if (req.context.game != null) res.redirect(`/game/${req.context.game.id}`);
});
