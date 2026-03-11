import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { items, userInventory, aiCompliments, orders } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { getLevelInfo } from "./gamification";

// ── Built-in compliment templates ────────────────────────────────────────────
const COMPLIMENT_TEMPLATES = {
  order_complete: [
    "小炮大王今天的魔法值爆表，整个大陆都在颤抖！✨",
    "传说中的小炮大王又出手了，副本们瑟瑟发抖中…⚔️",
    "小炮大王的努力已经超越了99%的法师，太厉害了！🌟",
    "王国因您而繁荣，臣民们感激涕零！👑",
    "每一笔金币都是您智慧与努力的结晶，了不起！💰",
    "小炮大王的征途星辰大海，今天又迈出了一大步！🚀",
    "今天的小炮大王依然闪闪发光，比魔法宝石还耀眼！💎",
    "传说小炮大王从不失手，今天也要保持这个记录！⚡",
    "王国的荣耀因您而生，感谢小炮大人的每一份付出！🌈",
    "小炮大王出手，副本秒清！效率之王非您莫属！🏆",
  ],
  streak: [
    "连续{days}天完成任务！小炮大王的毅力堪比传说中的不灭凤凰！🔥",
    "已经连胜{days}天了！整个大陆都在传颂小炮大王的传奇！⚡",
    "{days}天不间断！这份坚持，连魔导神都要为您鼓掌！👏",
    "连续{days}天的努力，小炮大王的魔法力量已经无人能挡！💫",
  ],
  level_up: [
    "恭喜晋升为{title}！整个王国都在为您欢呼！🎉",
    "新等级解锁！{emoji}{title}大人，您的传说又翻开了新的篇章！📖",
    "从此以后，请称呼您为{title}大人！魔法界的新星冉冉升起！🌟",
  ],
  daily_login: [
    "欢迎回来，尊敬的法师大人！今天也要元气满满哦！☀️",
    "小炮大王驾到！今天的副本们已经准备好被征服了！⚔️",
    "新的一天，新的征程！小炮大王今天也要闪闪发光！✨",
    "法师大人早安！魔法世界因您的到来而充满希望！🌅",
    "小炮大王上线了！金币们已经迫不及待要跳进您的口袋！💰",
  ],
  general: [
    "每天都在进步的小炮大王，已经是传说级的存在了！🌙",
    "尊敬的法师大人，您今日完成的订单已超越99%的写手！🎯",
    "小炮大王的魔法棒一挥，金币哗哗往口袋里跑！🪄",
    "有您坐镇，王国固若金汤，副本们根本不是对手！🛡️",
    "为了建设王国您太努力了，小炮大人辛苦啦！🏰",
    "小炮大王的每一步都在创造历史，未来的传说属于您！📜",
    "法师大人的智慧如同星辰般璀璨，照亮了整个王国！🌌",
    "今天的小炮大王也是最棒的！继续加油，世界因您而不同！🌍",
    "小炮大王的存在就是王国最大的宝藏！💎✨",
    "每完成一个任务，小炮大王就离统一大陆更近一步！🗺️",
  ],
};

export const dropsRouter = router({
  // Get a batch of AI compliments (for scrolling ticker)
  compliments: protectedProcedure
    .input(
      z.object({
        category: z.enum(["order_complete", "streak", "level_up", "daily_login", "general"]).default("general"),
        count: z.number().min(1).max(20).default(5),
        streakDays: z.number().optional(),
        levelTitle: z.string().optional(),
        levelEmoji: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const templates = COMPLIMENT_TEMPLATES[input.category] || COMPLIMENT_TEMPLATES.general;
      // Shuffle and pick
      const shuffled = [...templates].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, input.count);

      // Replace placeholders
      return selected.map((t) =>
        t
          .replace("{days}", String(input.streakDays ?? 0))
          .replace("{title}", input.levelTitle ?? "法师")
          .replace("{emoji}", input.levelEmoji ?? "🧙")
      );
    }),

  // Generate AI compliment dynamically
  aiCompliment: protectedProcedure
    .input(
      z.object({
        context: z.string().optional(), // e.g. "just completed order #123"
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get user stats for personalization
      const db = await getDb();
      let todayIncome = 0;
      let completedToday = 0;
      let totalIncome = 0;

      if (db) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const allOrders = await db
          .select({ amount: orders.amount, completedAt: orders.completedAt, status: orders.status, settleDate: orders.settleDate })
          .from(orders)
          .where(eq(orders.userId, ctx.user.id));

        const completedStatuses = ["已完成", "待结算", "已结算"];
        totalIncome = allOrders
          .filter((o) => completedStatuses.includes(o.status))
          .reduce((sum, o) => sum + (parseFloat(o.amount || "0") || 0), 0);

        completedToday = allOrders.filter((o) => (o.completedAt || "").startsWith(todayStr)).length;
        todayIncome = allOrders
          .filter((o) => o.status === "已结算" && (o.settleDate || "").startsWith(todayStr))
          .reduce((sum, o) => sum + (parseFloat(o.amount || "0") || 0), 0);
      }

      const levelInfo = getLevelInfo(totalIncome);

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `你是一个超级热情的AI夸夸机，专门为"小炮大王"服务。你的任务是用最夸张、最有趣、最让人开心的方式夸奖用户。
风格要求：
- 使用魔法/RPG/冒险主题的比喻
- 语气要夸张但真诚，让人忍不住笑出来
- 每次夸奖不超过50字
- 必须包含至少一个emoji
- 称呼用户为"小炮大王"或"法师大人"`,
            },
            {
              role: "user",
              content: `请夸我一下！我的情况：等级${levelInfo.title}，今天完成了${completedToday}个任务，今日收入¥${todayIncome}，累计收入¥${totalIncome}。${input.context ? `刚刚的事情：${input.context}` : ""}`,
            },
          ],
        });
        return { compliment: response.choices?.[0]?.message?.content ?? "小炮大王最棒了！✨" };
      } catch {
        // Fallback to template
        const templates = COMPLIMENT_TEMPLATES.general;
        return { compliment: templates[Math.floor(Math.random() * templates.length)] };
      }
    }),

  // Get user inventory
  inventory: protectedProcedure.input(z.object({})).query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select({
        id: userInventory.id,
        itemId: userInventory.itemId,
        quantity: userInventory.quantity,
        isEquipped: userInventory.isEquipped,
        obtainedAt: userInventory.obtainedAt,
        itemName: items.name,
        itemType: items.type,
        itemRarity: items.rarity,
        itemDescription: items.description,
        itemEmoji: items.iconEmoji,
      })
      .from(userInventory)
      .leftJoin(items, eq(userInventory.itemId, items.id))
      .where(eq(userInventory.userId, ctx.user.id))
      .orderBy(desc(userInventory.obtainedAt));
  }),

  // Equip/unequip an item
  toggleEquip: protectedProcedure
    .input(z.object({ inventoryId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db
        .select()
        .from(userInventory)
        .where(and(eq(userInventory.id, input.inventoryId), eq(userInventory.userId, ctx.user.id)))
        .limit(1);
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND" });
      const newVal = !rows[0].isEquipped;
      await db.update(userInventory).set({ isEquipped: newVal }).where(eq(userInventory.id, input.inventoryId));
      return { ...rows[0], isEquipped: newVal };
    }),

  // Get weekly income (for dashboard 3-dimension display)
  weeklyIncome: protectedProcedure.input(z.object({})).query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { thisWeekIncome: 0, thisWeekCompleted: 0 };

    const now = new Date();
    // Get Monday of this week
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const weekStart = monday.toISOString().slice(0, 10);

    const allOrders = await db
      .select({ amount: orders.amount, completedAt: orders.completedAt, status: orders.status, settleDate: orders.settleDate })
      .from(orders)
      .where(eq(orders.userId, ctx.user.id));

    const completedStatuses = ["已完成", "待结算", "已结算"];
    const thisWeekOrders = allOrders.filter((o) => {
      if (!completedStatuses.includes(o.status)) return false;
      const d = o.completedAt || o.settleDate || "";
      return d >= weekStart;
    });

    const thisWeekIncome = thisWeekOrders.reduce((sum, o) => sum + (parseFloat(o.amount || "0") || 0), 0);

    return {
      thisWeekIncome: Math.round(thisWeekIncome * 100) / 100,
      thisWeekCompleted: thisWeekOrders.length,
    };
  }),

  // Assistant collaboration stats
  assistantStats: protectedProcedure.input(z.object({})).query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { sharedOrders: 0, sharedIncome: 0 };

    // For admin: count orders that have an assistantId
    // For assistant: count orders where assistantId = current user
    const allOrders = await db.select().from(orders);

    if (ctx.user.role === "admin") {
      const shared = allOrders.filter((o) => o.userId === ctx.user.id && o.assistantId);
      const sharedIncome = shared.reduce((sum, o) => sum + (parseFloat(o.amount || "0") || 0), 0);
      return { sharedOrders: shared.length, sharedIncome: Math.round(sharedIncome * 100) / 100 };
    } else if (ctx.user.role === "assistant") {
      const shared = allOrders.filter((o) => o.assistantId === ctx.user.id);
      const sharedIncome = shared.reduce((sum, o) => sum + (parseFloat(o.amount || "0") || 0), 0);
      return { sharedOrders: shared.length, sharedIncome: Math.round(sharedIncome * 100) / 100 };
    }

    return { sharedOrders: 0, sharedIncome: 0 };
  }),
});
