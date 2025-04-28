import {
  fastifyTRPCPlugin,
  FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";
import { reactRouterFastify } from "@mcansh/remix-fastify/react-router";
import fastify from "fastify";
import { createContext } from "./context.server";
import { appRouter, type AppRouter } from "@/server/trpc/router";
import { lobbyRouter } from "@/server/trpc/lobby";
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
    router: lobbyRouter,
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
