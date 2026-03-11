import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getUserConfig,
  getAllOrdersForUser,
  getNotesByOrderId,
  getDailyGoal,
  createAiPlan,
  getAiPlans,
  getAiPlanById,
  isAssistantAuthorized,
} from "../db";
import { invokeLLM } from "../_core/llm";

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

export const aiRouter = router({
  plan: protectedProcedure
    .input(
      z.object({
        mode: z.enum(["daily", "weekly", "optimize", "custom"]).default("daily"),
        customPrompt: z.string().optional(),
        targetUserId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.user, input.targetUserId);
      const cfg = await getUserConfig(userId);

      const allOrders = await getAllOrdersForUser(userId);
      const active = allOrders.filter(
        (o) => o.status !== "已完成" && o.status !== "已结算"
      );

      if (active.length === 0) {
        return {
          result:
            "🎉 当前没有进行中的订单，今天可以好好休息！\n\n建议利用空闲时间：\n- 整理写作素材库\n- 学习新的写作技巧\n- 复盘近期订单经验",
          mode: input.mode,
          orderCount: 0,
          totalWords: 0,
        };
      }

      const today = new Date();
      const todayS = today.toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
      const todayWd = weekdays[today.getDay()];
      const totalWords = active.reduce((sum, o) => sum + (o.wordCount ?? 0), 0);
      const wordsPerHour = cfg?.wordsPerHour ?? 1500;
      const workHours = cfg?.workHoursPerDay ?? 8;

      const lines = await Promise.all(
        active.map(async (o) => {
          const orderNotes = (await getNotesByOrderId(o.id))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 3);
          const notesText =
            orderNotes.length > 0
              ? "；最近备注：" +
                orderNotes
                  .map(
                    (n) =>
                      `[${n.createdAt.toLocaleString("zh-CN", { hour12: false }).slice(5, 16)}] ${n.content}`
                  )
                  .join(" | ")
              : "";
          const wordInfo = o.wordCount ? `，字数要求: ${o.wordCount}字` : "";
          const titleInfo = o.title ? `，标题: ${o.title}` : "";
          const tagsInfo = o.tags ? `，标签: ${o.tags}` : "";
          const priorityInfo = (o.priority ?? 0) > 0 ? `，优先级: ${o.priority}` : "";
          return `- [ID:${o.id}] 订单${o.orderId || o.orderNo || "未填"}${titleInfo}，客服: ${o.clientService || "未填"}，金额: ¥${o.amount || "未填"}${wordInfo}，截止: ${o.deadline || "未设置"}，状态: ${o.status}${tagsInfo}${priorityInfo}${notesText}`;
        })
      );

      const todayDate = today.toISOString().slice(0, 10);
      const dailyGoal = await getDailyGoal(userId, todayDate);

      const systemPrompt = `你是我的私人工作助手，专门帮我管理写作订单和工作节奏。我是一名写手，主要通过客服派单接活，完成文章后进入审核和结算流程。

回复要求：
- 语气轻松自然，像和朋友聊天一样，不要太正式
- 直接给出具体建议，少说废话
- 关注我的实际订单数据，给出有针对性的建议
- 逾期订单要第一时间提醒，待结算的要提醒我去催款
- 输出用 Markdown 格式，表格和列表让内容更清晰

订单状态流转：待开始 → 进行中 → 待审核 → 已完成 → 待结算 → 已结算

请就着我的订单数据来回复，不要泛泛而谈。`;

      let userPrompt = "";
      if (input.mode === "daily") {
        userPrompt = `今天是 ${todayS}（${todayWd}），帮我看看今天应该怎么安排工作吧。

我想知道：
- 今天最紧急的订单是哪些，应该先做哪个
- 每个订单大概需要多久，今天能不能完成
- 如果有逾期的，应该怎么跟客服说
- 今天的总工作量大概有多少

当前订单数据（共 ${active.length} 个未完成，合计约 ${totalWords} 字）：
${lines.join("\n")}

工作参数：写作速度约 ${wordsPerHour} 字/小时，今日可工作 ${workHours} 小时，今日目标：${dailyGoal ? `${dailyGoal.targetWords}字 / ${dailyGoal.targetOrders}单` : "未设置"}。`;
      } else if (input.mode === "weekly") {
        userPrompt = `今天是 ${todayS}（${todayWd}），帮我理一下本周的工作安排。

我想知道：
- 本周哪些订单比较紧迫，哪些可以稍后处理
- 建议每天重点干什么
- 本周大概能收到多少钱（待结算的）
- 有没有可能逾期的风险

当前订单数据（共 ${active.length} 个未完成）：
${lines.join("\n")}`;
      } else if (input.mode === "optimize") {
        userPrompt = `帮我分析一下最近的工作情况，看看有没有可以做得更好的地方。

我想了解：
- 最近订单完成的情况怎么样，有没有逾期
- 哪个客服的订单比较麻烦，哪个比较顺
- 哪类订单性价比高，值得多接
- 具体有什么地方可以改进

当前订单数据：
${lines.join("\n")}`;
      } else if (input.mode === "custom" && input.customPrompt) {
        userPrompt = `${input.customPrompt}

我的订单数据（共 ${active.length} 个未完成）：
${lines.join("\n")}`;
      }

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        const result = response.choices[0].message.content as string;

        await createAiPlan({
          userId,
          content: result,
          mode: input.mode,
          orderCount: active.length,
          totalWords,
        });

        return { result, mode: input.mode, orderCount: active.length, totalWords };
      } catch (err: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `AI 规划失败: ${err.message}`,
        });
      }
    }),

  history: protectedProcedure
    .input(z.object({ targetUserId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.user, input.targetUserId);
      const plans = await getAiPlans(userId, 20);
      return plans.map((p) => ({
        id: p.id,
        mode: p.mode,
        orderCount: p.orderCount,
        totalWords: p.totalWords,
        createdAt: p.createdAt,
        preview: (p.content ?? "").slice(0, 200),
      }));
    }),

  getPlan: protectedProcedure
    .input(z.object({ id: z.number(), targetUserId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.user, input.targetUserId);
      const plan = await getAiPlanById(input.id, userId);
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "规划记录不存在" });
      return plan;
    }),
});
