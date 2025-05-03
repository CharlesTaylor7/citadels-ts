import { initTRPC, TRPCError } from "@trpc/server";
import { Context } from "@/server/context";

const trpc = initTRPC.context<Context>().create();
export const router = trpc.router;
export const anonymousProcedure = trpc.procedure;
export const loggedInProcedure = trpc.procedure.use((opts) => {
  if (!opts.ctx.userId)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User not authenticated",
    });
  //
  return opts.next({ ctx: { ...opts.ctx, userId: opts.ctx.userId } });
});
