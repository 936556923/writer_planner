import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getStats, isAssistantAuthorized } from "../db";
import { TRPCError } from "@trpc/server";

export const statsRouter = router({
  get: protectedProcedure
    .input(z.object({ targetUserId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      let userId = ctx.user.id;
      if (input.targetUserId && input.targetUserId !== ctx.user.id) {
        if (ctx.user.role === "assistant") {
          const authorized = await isAssistantAuthorized(ctx.user.id, input.targetUserId);
          if (!authorized) throw new TRPCError({ code: "FORBIDDEN", message: "未获得授权" });
          userId = input.targetUserId;
        } else {
          throw new TRPCError({ code: "FORBIDDEN", message: "无权查看他人统计" });
        }
      }
      return getStats(userId);
    }),
});
