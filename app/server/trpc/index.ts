import { initTRPC } from "@trpc/server";
import { Context } from "@/server/context.server";

export const t = initTRPC.context<Context>().create();
