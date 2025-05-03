import { initTRPC, TRPCError } from "@trpc/server";
import { Context } from "@/server/context";

const trpc = initTRPC.context<Context>().create({
  errorFormatter({ shape }) {
    return shape; // you can strip fields here if needed
  },
  onError({ error, path, type, ctx, input, req }) {
    if (!isProd) {
      console.error("tRPC Error:", error);
    }
  },
});
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
