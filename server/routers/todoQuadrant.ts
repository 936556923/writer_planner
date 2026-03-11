import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { todos } from "../../drizzle/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

const QUADRANT_VALUES = ["important_urgent", "important_not_urgent", "urgent_not_important", "neither"] as const;

export const todoQuadrantRouter = router({
  // List all todos for user
  list: protectedProcedure.input(z.object({})).query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(todos)
      .where(eq(todos.userId, ctx.user.id))
      .orderBy(asc(todos.sortOrder), desc(todos.createdAt));
  }),

  // Create a single todo
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        quadrant: z.enum(QUADRANT_VALUES).default("neither"),
        deadline: z.string().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db.insert(todos).values({
        userId: ctx.user.id,
        title: input.title,
        description: input.description ?? null,
        quadrant: input.quadrant,
        deadline: input.deadline ?? "",
        sortOrder: input.sortOrder ?? 0,
        aiClassified: false,
        isCompleted: false,
        coinReward: Math.floor(Math.random() * 20) + 5, // 5-25 coins
      });
      const insertId = (result as any)[0]?.insertId ?? 0;
      const rows = await db.select().from(todos).where(eq(todos.id, insertId)).limit(1);
      return rows[0];
    }),

  // Update a todo
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        quadrant: z.enum(QUADRANT_VALUES).optional(),
        deadline: z.string().optional(),
        sortOrder: z.number().optional(),
        isCompleted: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      // If completing, set completedAt
      const updateData: any = { ...data };
      if (data.isCompleted === true) {
        updateData.completedAt = new Date().toISOString();
      } else if (data.isCompleted === false) {
        updateData.completedAt = "";
      }
      await db
        .update(todos)
        .set(updateData)
        .where(and(eq(todos.id, id), eq(todos.userId, ctx.user.id)));
      const rows = await db
        .select()
        .from(todos)
        .where(and(eq(todos.id, id), eq(todos.userId, ctx.user.id)))
        .limit(1);
      return rows[0] ?? null;
    }),

  // Delete a todo
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db
        .delete(todos)
        .where(and(eq(todos.id, input.id), eq(todos.userId, ctx.user.id)));
      return { success: true };
    }),

  // Toggle completion (with gamification reward)
  toggleComplete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db
        .select()
        .from(todos)
        .where(and(eq(todos.id, input.id), eq(todos.userId, ctx.user.id)))
        .limit(1);
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND" });
      const todo = rows[0];
      const newCompleted = !todo.isCompleted;
      await db
        .update(todos)
        .set({
          isCompleted: newCompleted,
          completedAt: newCompleted ? new Date().toISOString() : "",
        })
        .where(eq(todos.id, input.id));

      // Generate reward on completion
      let reward = null;
      if (newCompleted) {
        const coins = todo.coinReward ?? Math.floor(Math.random() * 20) + 5;
        // Random drop check
        const dropRoll = Math.random();
        let drop = null;
        if (dropRoll < 0.03) {
          drop = { type: "pet_egg" as const, name: getRandomPetEgg(), rarity: "epic" as const };
        } else if (dropRoll < 0.10) {
          drop = { type: "equipment" as const, name: getRandomEquipment(), rarity: getRandomRarity() };
        } else if (dropRoll < 0.20) {
          drop = { type: "consumable" as const, name: getRandomConsumable(), rarity: "common" as const };
        }
        reward = { coins, drop };
      }

      return { ...todo, isCompleted: newCompleted, reward };
    }),

  // AI: parse text and classify into quadrants
  aiClassify: protectedProcedure
    .input(z.object({ text: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const today = new Date().toISOString().slice(0, 10);
      const prompt = `你是一个任务分类AI助手。用户会给你一段文字（可能是会议记录、聊天内容、想法笔记等），请从中提取所有可执行的任务，并按照"艾森豪威尔四象限"进行分类。

用户输入：
"${input.text}"

今天日期：${today}

请输出一个JSON数组，每个元素包含：
- title: 任务标题（简洁明了，不超过30字）
- description: 任务描述（可选，补充细节）
- quadrant: 象限分类，只能是以下之一：
  - "important_urgent": 重要且紧急（今天或明天必须做的）
  - "important_not_urgent": 重要不紧急（本周内需要做但不急的）
  - "urgent_not_important": 紧急不重要（可以委托他人的）
  - "neither": 不重要不紧急（可以暂时搁置的）
- deadline: 推断的截止日期 "YYYY-MM-DD"（不确定就留空字符串）

分类原则：
1. 有明确截止日期且在2天内的 → important_urgent
2. 涉及核心工作/收入/健康但不急的 → important_not_urgent
3. 日常行政/回复/琐事但有时间要求的 → urgent_not_important
4. 想法/灵感/低优先级的 → neither
5. 只输出JSON数组，不要其他文字`;

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "你是任务分类AI，只输出合法JSON数组，不要任何其他文字。" },
            { role: "user", content: prompt },
          ],
        });

        const rawContent = response.choices?.[0]?.message?.content ?? "[]";
        const raw = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return { todos: [], raw };

        const parsed = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(parsed)) return { todos: [], raw };

        // Save to DB
        const db = await getDb();
        const savedTodos = [];
        if (db) {
          for (const item of parsed) {
            try {
              const result = await db.insert(todos).values({
                userId: ctx.user.id,
                title: item.title || "未命名任务",
                description: item.description || null,
                quadrant: QUADRANT_VALUES.includes(item.quadrant) ? item.quadrant : "neither",
                deadline: item.deadline || "",
                aiClassified: true,
                isCompleted: false,
                sortOrder: 0,
                coinReward: Math.floor(Math.random() * 20) + 5,
              });
              const insertId = (result as any)[0]?.insertId ?? 0;
              const rows = await db.select().from(todos).where(eq(todos.id, insertId)).limit(1);
              if (rows[0]) savedTodos.push(rows[0]);
            } catch (e) {
              console.warn("Failed to save todo:", e);
            }
          }
        }

        return { todos: savedTodos, parsed, raw };
      } catch (err: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `AI分类失败: ${err.message}`,
        });
      }
    }),
});

// ── Random Drop Helpers ──────────────────────────────────────────────────────
function getRandomPetEgg(): string {
  const eggs = ["火焰小龙蛋 🥚🔥", "星光独角兽蛋 🥚✨", "暗影猫咪蛋 🥚🐱", "雷霆凤凰蛋 🥚⚡", "水晶兔兔蛋 🥚💎", "彩虹鹦鹉蛋 🥚🌈"];
  return eggs[Math.floor(Math.random() * eggs.length)];
}

function getRandomEquipment(): string {
  const items = [
    "智慧之笔 ✒️", "灵感护符 🔮", "效率斗篷 🧥", "专注头盔 ⛑️",
    "创意手套 🧤", "毅力之靴 👢", "时间之戒 💍", "魔法墨水瓶 🧪",
  ];
  return items[Math.floor(Math.random() * items.length)];
}

function getRandomConsumable(): string {
  const items = ["经验药水 🧪", "双倍金币卷轴 📜", "灵感之泉 🫧", "能量面包 🍞", "专注咖啡 ☕"];
  return items[Math.floor(Math.random() * items.length)];
}

function getRandomRarity(): "common" | "rare" | "epic" | "legendary" {
  const r = Math.random();
  if (r < 0.5) return "common";
  if (r < 0.8) return "rare";
  if (r < 0.95) return "epic";
  return "legendary";
}
