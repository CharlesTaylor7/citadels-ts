import {
  fastifyTRPCPlugin,
  FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";
import { reactRouterFastify } from "@mcansh/remix-fastify/react-router";
import fastify from "fastify";
import { createContext } from "./context.server";
import { appRouter, type AppRouter } from "./router.server";
const server = fastify({
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
(async () => {
  try {
    await server.listen({ port: 3000 });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
})();
