import { initTRPC } from "@trpc/server";
import { Context } from "@/server/context.server";

export const t = initTRPC.context<Context>().create();
// t.procedure.use((opts) => {
//   opts.ctx;
//   return opts.next();
// });
