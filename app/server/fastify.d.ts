import { Context } from "@/server/context.server";
import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    context: Context;
  }
}
