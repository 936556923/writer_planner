import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { calendarEvents } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// ── Calendar Router ──────────────────────────────────────────────────────────
export const calendarRouter = router({
  // List events for a date range
  list: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(), // YYYY-MM-DD
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const userId = ctx.user.id;

      const conditions = [eq(calendarEvents.userId, userId)];
      if (input.startDate) conditions.push(gte(calendarEvents.date, input.startDate));
      if (input.endDate) conditions.push(lte(calendarEvents.date, input.endDate));

      return db
        .select()
        .from(calendarEvents)
        .where(and(...conditions))
        .orderBy(asc(calendarEvents.date), asc(calendarEvents.startTime));
    }),

  // Get today's events
  today: protectedProcedure.input(z.object({})).query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const todayStr = new Date().toISOString().slice(0, 10);
    return db
      .select()
      .from(calendarEvents)
      .where(and(eq(calendarEvents.userId, ctx.user.id), eq(calendarEvents.date, todayStr)))
      .orderBy(asc(calendarEvents.startTime));
  }),

  // Create a single event
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        eventType: z.enum(["work", "fitness", "skincare", "meal", "rest", "social", "other"]).default("other"),
        startTime: z.string(), // HH:MM
        endTime: z.string().optional(),
        date: z.string(), // YYYY-MM-DD
        isRecurring: z.boolean().default(false),
        cronRule: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
      const result = await db.insert(calendarEvents).values({
        userId: ctx.user.id,
        title: input.title,
        eventType: input.eventType,
        startTime: input.startTime,
        endTime: input.endTime ?? "",
        date: input.date,
        isRecurring: input.isRecurring,
        cronRule: input.cronRule ?? "",
        isCompleted: false,
      });
      const insertId = (result as any)[0]?.insertId ?? 0;
      const rows = await db.select().from(calendarEvents).where(eq(calendarEvents.id, insertId)).limit(1);
      return rows[0];
    }),

  // Update an event
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        eventType: z.enum(["work", "fitness", "skincare", "meal", "rest", "social", "other"]).optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        date: z.string().optional(),
        isRecurring: z.boolean().optional(),
        cronRule: z.string().optional(),
        isCompleted: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
      const { id, ...data } = input;
      await db
        .update(calendarEvents)
        .set(data as any)
        .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, ctx.user.id)));
      const rows = await db
        .select()
        .from(calendarEvents)
        .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, ctx.user.id)))
        .limit(1);
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "事件不存在" });
      return rows[0];
    }),

  // Delete an event
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db
        .delete(calendarEvents)
        .where(and(eq(calendarEvents.id, input.id), eq(calendarEvents.userId, ctx.user.id)));
      return { success: true };
    }),

  // Toggle completion
  toggleComplete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db
        .select()
        .from(calendarEvents)
        .where(and(eq(calendarEvents.id, input.id), eq(calendarEvents.userId, ctx.user.id)))
        .limit(1);
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND" });
      const newVal = !rows[0].isCompleted;
      await db
        .update(calendarEvents)
        .set({ isCompleted: newVal })
        .where(eq(calendarEvents.id, input.id));
      return { ...rows[0], isCompleted: newVal };
    }),

  // AI: parse natural language into calendar events
  aiParse: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1),
        weekStartDate: z.string().optional(), // YYYY-MM-DD of the target week's Monday
      })
    )
    .mutation(async ({ ctx, input }) => {
      const today = new Date().toISOString().slice(0, 10);
      const weekStart = input.weekStartDate ?? today;

      const prompt = `你是一个日程管理AI助手。用户会给你一段自然语言描述他们的日常计划或行程安排。
请将其解析为结构化的日历事件列表。

用户输入：
"${input.text}"

目标周起始日期：${weekStart}
今天日期：${today}

请输出一个JSON数组，每个元素包含：
- title: 事件标题（简洁）
- eventType: 类型，只能是 "work" | "fitness" | "skincare" | "meal" | "rest" | "social" | "other"
- startTime: 开始时间 "HH:MM"
- endTime: 结束时间 "HH:MM"（如果不确定就留空字符串）
- date: 日期 "YYYY-MM-DD"（根据描述推断，如"每周一"就用目标周的周一日期）
- isRecurring: 是否重复事件 true/false
- cronRule: 重复规则，如 "daily" / "weekdays" / "mon,wed,fri" / "weekly" 等（非重复事件留空字符串）

注意：
1. 如果用户说"每天"，生成7天的事件，isRecurring=true, cronRule="daily"
2. 如果用户说"工作日"，生成周一到周五，cronRule="weekdays"
3. 如果用户说"每周一三五"，只生成那几天，cronRule="mon,wed,fri"
4. 合理推断事件类型：健身→fitness，护肤→skincare，吃饭/早餐/午餐/晚餐→meal，工作/写作→work
5. 只输出JSON数组，不要其他文字

示例输出：
[{"title":"早餐","eventType":"meal","startTime":"08:00","endTime":"08:30","date":"2026-03-10","isRecurring":true,"cronRule":"daily"}]`;

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "你是日程解析AI，只输出合法JSON数组，不要任何其他文字。" },
            { role: "user", content: prompt },
          ],
        });

        const rawContent = response.choices?.[0]?.message?.content ?? "[]";
        const raw = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return { events: [], raw };

        const parsed = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(parsed)) return { events: [], raw };

        // Save to DB
        const db = await getDb();
        const savedEvents = [];
        if (db) {
          for (const evt of parsed) {
            try {
              const result = await db.insert(calendarEvents).values({
                userId: ctx.user.id,
                title: evt.title || "未命名事件",
                eventType: evt.eventType || "other",
                startTime: evt.startTime || "09:00",
                endTime: evt.endTime || "",
                date: evt.date || today,
                isRecurring: evt.isRecurring ?? false,
                cronRule: evt.cronRule || "",
                isCompleted: false,
              });
              const insertId = (result as any)[0]?.insertId ?? 0;
              const rows = await db.select().from(calendarEvents).where(eq(calendarEvents.id, insertId)).limit(1);
              if (rows[0]) savedEvents.push(rows[0]);
            } catch (e) {
              console.warn("Failed to save calendar event:", e);
            }
          }
        }

        return { events: savedEvents, parsed, raw };
      } catch (err: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `AI解析失败: ${err.message}`,
        });
      }
    }),
});
