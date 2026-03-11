import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  batchDeleteOrders,
  batchUpdateOrderStatus,
  getAllOrdersForUser,
  getNotesByOrderId,
  createNote,
  updateNote,
  deleteNote,
  getMeta,
  isAssistantAuthorized,
  getTodayTasks,
  getTodaySummary,
} from "../db";

const ORDER_STATUSES = ["待开始", "进行中", "待审核", "已完成", "待结算", "已结算"] as const;
const WRITING_STATUSES = ["初稿待提交", "修改", "已完成", "待开始", "进行中", "修改中"] as const;
const SUBMISSION_STATUSES = ["已提交", "未提交", "待提交", "收货待提交"] as const;
const SETTLE_STATUSES = ["已结算", "未结算", "待结算", "异常核实中"] as const;

// Helper: resolve the effective userId for an operation
// - admin/user: can only operate on their own data
// - assistant: can operate on authorized admin's data via targetUserId
async function resolveUserId(
  currentUser: { id: number; role: string },
  targetUserId?: number
): Promise<number> {
  if (!targetUserId || targetUserId === currentUser.id) {
    return currentUser.id;
  }
  if (currentUser.role === "assistant") {
    const authorized = await isAssistantAuthorized(currentUser.id, targetUserId);
    if (!authorized) {
      throw new TRPCError({ code: "FORBIDDEN", message: "未获得该用户的授权" });
    }
    return targetUserId;
  }
  throw new TRPCError({ code: "FORBIDDEN", message: "无权操作他人数据" });
}

export const ordersRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        targetUserId: z.number().optional(),
        search: z.string().optional(),
        status: z.string().optional(),
        clientService: z.string().optional(),
        settleStatus: z.string().optional(),
        writingStatus: z.string().optional(),
        submissionStatus: z.string().optional(),
        sortBy: z.string().optional(),
        sortDir: z.enum(["ASC", "DESC"]).optional(),
        page: z.number().optional(),
        pageSize: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.user, input.targetUserId);
      const { orders, total } = await getOrders({
        userId,
        search: input.search,
        status: input.status,
        clientService: input.clientService,
        settleStatus: input.settleStatus,
        writingStatus: input.writingStatus,
        submissionStatus: input.submissionStatus,
        sortBy: input.sortBy,
        sortDir: input.sortDir,
        page: input.page ?? 1,
        pageSize: input.pageSize ?? 200,
      });

      // Attach notes to each order
      const ordersWithNotes = await Promise.all(
        orders.map(async (order) => {
          const orderNotes = await getNotesByOrderId(order.id);
          return { ...order, notes: orderNotes };
        })
      );

      return { orders: ordersWithNotes, total, page: input.page ?? 1 };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number(), targetUserId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.user, input.targetUserId);
      const order = await getOrderById(input.id, userId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "订单不存在" });
      const orderNotes = await getNotesByOrderId(order.id);
      return { ...order, notes: orderNotes };
    }),

  create: protectedProcedure
    .input(
      z.object({
        targetUserId: z.number().optional(),
        orderId: z.string().optional(),
        orderNo: z.string().optional(),
        clientService: z.string().optional(),
        designer: z.string().optional(),
        amount: z.string().optional(),
        settleDate: z.string().optional(),
        deadline: z.string().optional(),
        title: z.string().optional(),
        wordCount: z.number().optional(),
        status: z.enum(ORDER_STATUSES).optional(),
        settleStatus: z.enum(SETTLE_STATUSES).optional(),
        settleFeedback: z.string().optional(),
        writingStatus: z.enum(WRITING_STATUSES).optional(),
        submissionStatus: z.enum(SUBMISSION_STATUSES).optional(),
        progressStatus: z.string().optional(),
        priority: z.number().optional(),
        tags: z.string().optional(),
        estimatedHours: z.number().optional(),
        actualHours: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.user, input.targetUserId);
      const { targetUserId, ...data } = input;
      const order = await createOrder({
        userId,
        orderId: data.orderId ?? "",
        orderNo: data.orderNo ?? "",
        clientService: data.clientService ?? "",
        designer: data.designer ?? "",
        amount: data.amount ?? "",
        settleDate: data.settleDate ?? "",
        deadline: data.deadline ?? "",
        title: data.title ?? "",
        wordCount: data.wordCount ?? 0,
        status: data.status ?? "待开始",
        settleStatus: (data.settleStatus ?? "未结算") as any,
        settleFeedback: data.settleFeedback ?? "",
        writingStatus: (data.writingStatus ?? "待开始") as any,
        submissionStatus: (data.submissionStatus ?? "未提交") as any,
        progressStatus: data.progressStatus ?? "",
        priority: data.priority ?? 0,
        tags: data.tags ?? "",
        estimatedHours: data.estimatedHours ?? 0,
        actualHours: data.actualHours ?? 0,
        completedAt: "",
      });
      return order;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        targetUserId: z.number().optional(),
        orderId: z.string().optional(),
        orderNo: z.string().optional(),
        clientService: z.string().optional(),
        designer: z.string().optional(),
        amount: z.string().optional(),
        settleDate: z.string().optional(),
        deadline: z.string().optional(),
        title: z.string().optional(),
        wordCount: z.number().optional(),
        status: z.enum(ORDER_STATUSES).optional(),
        settleStatus: z.enum(SETTLE_STATUSES).optional(),
        settleFeedback: z.string().optional(),
        writingStatus: z.enum(WRITING_STATUSES).optional(),
        submissionStatus: z.enum(SUBMISSION_STATUSES).optional(),
        progressStatus: z.string().optional(),
        priority: z.number().optional(),
        tags: z.string().optional(),
        estimatedHours: z.number().optional(),
        actualHours: z.number().optional(),
        completedAt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.user, input.targetUserId);
      const { id, targetUserId, ...data } = input;

      // Auto-set completedAt when status changes to 已完成/已结算
      const updateData: typeof data & { completedAt?: string; deadline?: string } = { ...data };
      // Fetch existing order once for both auto-completedAt and auto-deadline logic
      let existingOrder: Awaited<ReturnType<typeof getOrderById>> | null = null;
      if ((data.status === "已完成" || data.status === "已结算") || data.settleDate !== undefined || data.settleStatus !== undefined) {
        existingOrder = await getOrderById(id, userId);
      }
      if ((data.status === "已完成" || data.status === "已结算") && !data.completedAt) {
        if (!existingOrder?.completedAt) {
          updateData.completedAt = new Date()
            .toLocaleString("zh-CN", { hour12: false })
            .replace(/\//g, "-");
        }
      }

      // 状态联动：当settleStatus改为"已结算"时，自动同步其他字段
      if (data.settleStatus === "已结算") {
        if (!updateData.writingStatus) updateData.writingStatus = "已完成" as any;
        if (!updateData.submissionStatus) updateData.submissionStatus = "已提交" as any;
        if (!updateData.status) updateData.status = "已结算";
        if (!data.completedAt && !existingOrder?.completedAt) {
          updateData.completedAt = new Date()
            .toLocaleString("zh-CN", { hour12: false })
            .replace(/\//g, "-");
        }
      }

      // 当settleStatus改为"待结算"时，同步status
      if (data.settleStatus === "待结算") {
        if (!updateData.status) updateData.status = "待结算";
      }

      // 当settleStatus改为"异常核实中"时，保留待结算状态
      if (data.settleStatus === "异常核实中") {
        if (!updateData.status) updateData.status = "待结算";
      }

      // Auto-sync deadline = settleDate when settling, if deadline is currently empty
      if (data.status === "已结算" || data.settleDate !== undefined) {
        const effectiveDeadline = data.deadline ?? existingOrder?.deadline ?? "";
        const effectiveSettleDate = data.settleDate ?? existingOrder?.settleDate ?? "";
        if (!effectiveDeadline && effectiveSettleDate) {
          updateData.deadline = effectiveSettleDate;
        }
      }

      const order = await updateOrder(id, userId, updateData);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "订单不存在" });
      const orderNotes = await getNotesByOrderId(order.id);
      return { ...order, notes: orderNotes };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number(), targetUserId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.user, input.targetUserId);
      await deleteOrder(input.id, userId);
      return { success: true };
    }),

  batchDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.number()), targetUserId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.user, input.targetUserId);
      await batchDeleteOrders(input.ids, userId);
      return { success: true, deleted: input.ids.length };
    }),

  batchUpdateStatus: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.number()),
        status: z.enum(ORDER_STATUSES),
        targetUserId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.user, input.targetUserId);
      await batchUpdateOrderStatus(input.ids, userId, input.status);
      return { success: true, updated: input.ids.length };
    }),

  // 批量结算：将多个订单的settleStatus改为已结算
  batchSettle: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.number()),
        settleDate: z.string().optional(),
        targetUserId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.user, input.targetUserId);
      const now = new Date().toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-");
      for (const orderId of input.ids) {
        await updateOrder(orderId, userId, {
          settleStatus: "已结算" as any,
          status: "已结算",
          writingStatus: "已完成" as any,
          submissionStatus: "已提交" as any,
          settleDate: input.settleDate ?? now,
          completedAt: now,
        });
      }
      return { success: true, updated: input.ids.length };
    }),

  meta: protectedProcedure
    .input(z.object({ targetUserId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.user, input.targetUserId);
      return getMeta(userId);
    }),

  // Notes
  addNote: protectedProcedure
    .input(
      z.object({
        orderId: z.number(),
        content: z.string().min(1),
        type: z.enum(["normal", "important"]).optional(),
        targetUserId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.user, input.targetUserId);
      // Verify order belongs to user
      const order = await getOrderById(input.orderId, userId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "订单不存在" });
      return createNote({
        orderId: input.orderId,
        userId,
        content: input.content,
        type: input.type ?? "normal",
      });
    }),

  updateNote: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        content: z.string().optional(),
        type: z.enum(["normal", "important"]).optional(),
        targetUserId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.user, input.targetUserId);
      await updateNote(input.id, userId, { content: input.content, type: input.type });
      return { success: true };
    }),

  deleteNote: protectedProcedure
    .input(z.object({ id: z.number(), targetUserId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.user, input.targetUserId);
      await deleteNote(input.id, userId);
      return { success: true };
    }),

  // ── Today's Task List ──────────────────────────────────────────────────────
  todayTasks: protectedProcedure
    .input(z.object({ targetUserId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.user, input.targetUserId);
      const tasks = await getTodayTasks(userId);
      return tasks;
    }),

  todaySummary: protectedProcedure
    .input(z.object({ targetUserId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.user, input.targetUserId);
      return getTodaySummary(userId);
    }),

  // Mark an order as complete (changes status to 已完成)
  markComplete: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        targetUserId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.user, input.targetUserId);
      const order = await getOrderById(input.id, userId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "订单不存在" });
      const completedAt = new Date().toISOString();
      await updateOrder(input.id, userId, { writingStatus: "已完成" as any, submissionStatus: "已提交" as any, completedAt });
      return { success: true, completedAt };
    }),

  // Unmark complete (revert to 进行中)
  unmarkComplete: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        targetUserId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.user, input.targetUserId);
      const order = await getOrderById(input.id, userId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "订单不存在" });
      await updateOrder(input.id, userId, { writingStatus: "待开始" as any, submissionStatus: "未提交" as any, completedAt: "" });
      return { success: true };
    }),
});
