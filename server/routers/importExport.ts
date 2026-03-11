import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getAllOrdersForUser, isAssistantAuthorized } from "../db";

async function resolveUserId(
  currentUser: { id: number; role: string },
  targetUserId?: number
): Promise<number> {
  if (!targetUserId || targetUserId === currentUser.id) return currentUser.id;
  if (currentUser.role === "assistant") {
    const authorized = await isAssistantAuthorized(currentUser.id, targetUserId);
    if (!authorized) throw new TRPCError({ code: "FORBIDDEN", message: "未获得该用户的授权" });
    return targetUserId;
  }
  throw new TRPCError({ code: "FORBIDDEN", message: "无权操作他人数据" });
}

export const importExportRouter = router({
  // Export orders as JSON data (actual file download handled by Express route)
  exportData: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        targetUserId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.user, input.targetUserId);
      let allOrders = await getAllOrdersForUser(userId);
      if (input.status && input.status !== "all") {
        allOrders = allOrders.filter((o) => o.status === input.status);
      }
      return allOrders.map((o) => ({
        订单ID: o.orderId,
        订单编号: o.orderNo,
        派单客服: o.clientService,
        接单设计师: o.designer,
        标题: o.title,
        字数要求: o.wordCount,
        金额: o.amount,
        状态: o.status,
        写作状态: o.writingStatus,
        提交状态: o.submissionStatus,
        结算状态: o.settleStatus,
        结算反馈: (o as any).settleFeedback ?? "",
        进度状态: o.progressStatus,
        截止时间: o.deadline,
        结算日期: o.settleDate,
        标签: o.tags,
        优先级: o.priority,
        预估工时: o.estimatedHours,
        实际工时: o.actualHours,
        完成时间: o.completedAt,
        创建时间: o.createdAt?.toLocaleString("zh-CN", { hour12: false }),
        更新时间: o.updatedAt?.toLocaleString("zh-CN", { hour12: false }),
      }));
    }),
});
