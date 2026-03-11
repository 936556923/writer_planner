import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getUserConfig,
  upsertUserConfig,
  getDailyGoal,
  upsertDailyGoal,
  isAssistantAuthorized,
  getAuthorizationsForAdmin,
  getAuthorizationsForAssistant,
  createAuthorization,
  deleteAuthorization,
  getAllUsers,
  updateUserRole,
  getUserById,
} from "../db";

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

export const settingsRouter = router({
  // ── Config ──────────────────────────────────────────────────────────────────
  getConfig: protectedProcedure
    .input(z.object({ targetUserId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.user, input.targetUserId);
      const cfg = await getUserConfig(userId);
      return {
        aiModel: cfg?.aiModel ?? "deepseek-chat",
        wordsPerHour: cfg?.wordsPerHour ?? 1500,
        workHoursPerDay: cfg?.workHoursPerDay ?? 8,
        defaultStatus: cfg?.defaultStatus ?? "待开始",
        hasDeepseekKey: !!(cfg?.deepseekKey),
      };
    }),

  updateConfig: protectedProcedure
    .input(
      z.object({
        targetUserId: z.number().optional(),
        aiModel: z.string().optional(),
        wordsPerHour: z.number().optional(),
        workHoursPerDay: z.number().optional(),
        defaultStatus: z.string().optional(),
        deepseekKey: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.user, input.targetUserId);
      const { targetUserId, ...data } = input;
      await upsertUserConfig(userId, data);
      return { success: true };
    }),

  // ── Daily Goals ──────────────────────────────────────────────────────────────
  getDailyGoal: protectedProcedure
    .input(z.object({ date: z.string(), targetUserId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.user, input.targetUserId);
      const goal = await getDailyGoal(userId, input.date);
      return (
        goal ?? {
          date: input.date,
          targetWords: 0,
          targetOrders: 0,
          actualWords: 0,
          actualOrders: 0,
          note: "",
        }
      );
    }),

  upsertDailyGoal: protectedProcedure
    .input(
      z.object({
        date: z.string(),
        targetUserId: z.number().optional(),
        targetWords: z.number().optional(),
        targetOrders: z.number().optional(),
        actualWords: z.number().optional(),
        actualOrders: z.number().optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.user, input.targetUserId);
      const { date, targetUserId, ...data } = input;
      await upsertDailyGoal(userId, date, data);
      return { success: true };
    }),

  // ── Authorizations (Admin manages assistants) ────────────────────────────────
  getMyAuthorizations: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "admin") {
      return {
        type: "admin" as const,
        authorizations: await getAuthorizationsForAdmin(ctx.user.id),
      };
    }
    if (ctx.user.role === "assistant") {
      return {
        type: "assistant" as const,
        authorizations: await getAuthorizationsForAssistant(ctx.user.id),
      };
    }
    return { type: "user" as const, authorizations: [] };
  }),

  grantAssistant: protectedProcedure
    .input(z.object({ assistantId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "只有管理员可以授权助理" });
      }
      const assistant = await getUserById(input.assistantId);
      if (!assistant) throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
      if (assistant.role !== "assistant") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "该用户不是助理角色" });
      }
      await createAuthorization(ctx.user.id, input.assistantId);
      return { success: true };
    }),

  revokeAssistant: protectedProcedure
    .input(z.object({ assistantId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "只有管理员可以撤销授权" });
      }
      await deleteAuthorization(ctx.user.id, input.assistantId);
      return { success: true };
    }),

  // ── Admin: User Management ───────────────────────────────────────────────────
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "仅管理员可查看用户列表" });
    }
    return getAllUsers();
  }),

  updateUserRole: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(["user", "admin", "assistant"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "仅管理员可修改用户角色" });
      }
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "不能修改自己的角色" });
      }
      await updateUserRole(input.userId, input.role);
      return { success: true };
    }),

  // ── Assistant: get authorized admins ────────────────────────────────────────
  getAuthorizedAdmins: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "assistant") return [];
    const auths = await getAuthorizationsForAssistant(ctx.user.id);
    return auths.map((a) => ({
      adminId: a.adminId,
      adminName: a.adminName,
      adminEmail: a.adminEmail,
    }));
  }),
});
