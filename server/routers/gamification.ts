import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { orders, dailyGoals } from "../../drizzle/schema";
import { eq, and, gte, lte, sql, desc, not, inArray } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// ── Magic Level System (based on total settled income) ────────────────────────
export const MAGIC_LEVELS = [
  { level: 1, title: "见习法师",     minIncome: 0,       maxIncome: 5000,    emoji: "🧙", color: "#94a3b8", xpNext: 5000 },
  { level: 2, title: "初级法师",     minIncome: 5000,    maxIncome: 15000,   emoji: "🔮", color: "#60a5fa", xpNext: 15000 },
  { level: 3, title: "中级法师",     minIncome: 15000,   maxIncome: 30000,   emoji: "⚡", color: "#34d399", xpNext: 30000 },
  { level: 4, title: "高级法师",     minIncome: 30000,   maxIncome: 60000,   emoji: "🌟", color: "#fbbf24", xpNext: 60000 },
  { level: 5, title: "大法师",       minIncome: 60000,   maxIncome: 100000,  emoji: "🔥", color: "#f97316", xpNext: 100000 },
  { level: 6, title: "魔导士",       minIncome: 100000,  maxIncome: 200000,  emoji: "💫", color: "#a78bfa", xpNext: 200000 },
  { level: 7, title: "魔导王",       minIncome: 200000,  maxIncome: 500000,  emoji: "👑", color: "#ec4899", xpNext: 500000 },
  { level: 8, title: "魔导皇",       minIncome: 500000,  maxIncome: 1000000, emoji: "🌈", color: "#06b6d4", xpNext: 1000000 },
  { level: 9, title: "魔导神",       minIncome: 1000000, maxIncome: Infinity, emoji: "✨", color: "#f59e0b", xpNext: Infinity },
];

export function getLevelInfo(totalIncome: number) {
  const lvl = MAGIC_LEVELS.findLast(l => totalIncome >= l.minIncome) ?? MAGIC_LEVELS[0];
  const nextLvl = MAGIC_LEVELS.find(l => l.level === lvl.level + 1);
  const progress = nextLvl
    ? Math.min(100, Math.round(((totalIncome - lvl.minIncome) / (nextLvl.minIncome - lvl.minIncome)) * 100))
    : 100;
  return { ...lvl, progress, nextLevel: nextLvl ?? null, totalIncome };
}

// ── World Conquest Phrases ─────────────────────────────────────────────────────
export function getConquestPhrase(totalIncome: number, todayIncome: number, completedToday: number): string {
  const lvl = getLevelInfo(totalIncome);
  const phrases = [
    `尊敬的${lvl.emoji}${lvl.title}大人，您已累计斩获 ¥${totalIncome.toLocaleString()} 魔法金币，距离统一世界的目标更进一步啦！`,
    `${lvl.emoji}${lvl.title}大人威武！今日又收割了 ${completedToday} 张订单，魔法金币 ¥${todayIncome.toLocaleString()} 已入账，帝国版图持续扩张中！`,
    `伟大的${lvl.title}大人，您的魔法力量已达 ¥${totalIncome.toLocaleString()}！各路势力望风披靡，统一大陆指日可待！`,
    `${lvl.emoji} 法师大人，今日战绩辉煌！累计魔法金币 ¥${totalIncome.toLocaleString()}，您的传说正在被世人传颂！`,
    `尊敬的${lvl.title}，帝国财库已储备 ¥${totalIncome.toLocaleString()} 魔法金币！继续征战，终将一统天下！`,
  ];
  // Pick based on day of week for variety
  const idx = new Date().getDay() % phrases.length;
  return phrases[idx];
}

// ── Achievements ──────────────────────────────────────────────────────────────
export const ACHIEVEMENTS = [
  { id: "first_order",    name: "初出茅庐",   emoji: "🌱", desc: "完成第一笔订单",          check: (stats: GameStats) => stats.totalCompleted >= 1 },
  { id: "ten_orders",     name: "小试牛刀",   emoji: "⚔️",  desc: "累计完成10笔订单",        check: (stats: GameStats) => stats.totalCompleted >= 10 },
  { id: "fifty_orders",   name: "百战老将",   emoji: "🛡️",  desc: "累计完成50笔订单",        check: (stats: GameStats) => stats.totalCompleted >= 50 },
  { id: "hundred_orders", name: "千军万马",   emoji: "🏆",  desc: "累计完成100笔订单",       check: (stats: GameStats) => stats.totalCompleted >= 100 },
  { id: "income_5k",      name: "小富即安",   emoji: "💰",  desc: "累计收入破5000",          check: (stats: GameStats) => stats.totalIncome >= 5000 },
  { id: "income_10k",     name: "万元户",     emoji: "💎",  desc: "累计收入破10000",         check: (stats: GameStats) => stats.totalIncome >= 10000 },
  { id: "income_50k",     name: "财富自由",   emoji: "🌟",  desc: "累计收入破50000",         check: (stats: GameStats) => stats.totalIncome >= 50000 },
  { id: "income_100k",    name: "魔法富翁",   emoji: "👑",  desc: "累计收入破100000",        check: (stats: GameStats) => stats.totalIncome >= 100000 },
  { id: "streak_3",       name: "三日不辍",   emoji: "🔥",  desc: "连续3天完成订单",         check: (stats: GameStats) => stats.streakDays >= 3 },
  { id: "streak_7",       name: "七日连胜",   emoji: "⚡",  desc: "连续7天完成订单",         check: (stats: GameStats) => stats.streakDays >= 7 },
  { id: "streak_30",      name: "月度霸主",   emoji: "🌈",  desc: "连续30天完成订单",        check: (stats: GameStats) => stats.streakDays >= 30 },
  { id: "month_10k",      name: "月入过万",   emoji: "🎯",  desc: "单月收入超过10000",       check: (stats: GameStats) => stats.thisMonthIncome >= 10000 },
];

interface GameStats {
  totalCompleted: number;
  totalIncome: number;
  streakDays: number;
  thisMonthIncome: number;
}

// ── DB helpers ────────────────────────────────────────────────────────────────
async function getGameStats(userId: number): Promise<GameStats> {
  const db = await getDb();
  if (!db) return { totalCompleted: 0, totalIncome: 0, streakDays: 0, thisMonthIncome: 0 };

  // Total completed orders and income
  const completedStatuses = ["已完成", "待结算", "已结算"];
  const allOrders = await db
    .select({ status: orders.status, amount: orders.amount, completedAt: orders.completedAt, settleDate: orders.settleDate })
    .from(orders)
    .where(eq(orders.userId, userId));

  const completedOrders = allOrders.filter(o => completedStatuses.includes(o.status));
  const totalIncome = completedOrders.reduce((sum, o) => {
    const amt = parseFloat(o.amount || "0");
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  // This month income
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const thisMonthOrders = completedOrders.filter(o => {
    const d = o.settleDate || o.completedAt || "";
    return d >= monthStart;
  });
  const thisMonthIncome = thisMonthOrders.reduce((sum, o) => {
    const amt = parseFloat(o.amount || "0");
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  // Streak: count consecutive days with at least one completed order
  const completedDates = new Set(
    completedOrders
      .map(o => (o.completedAt || o.settleDate || "").substring(0, 10))
      .filter(d => d.length === 10)
  );

  let streakDays = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().substring(0, 10);
    if (completedDates.has(ds)) {
      streakDays++;
    } else if (i > 0) {
      break; // streak broken
    }
  }

  return {
    totalCompleted: completedOrders.length,
    totalIncome,
    streakDays,
    thisMonthIncome,
  };
}

// ── Router ────────────────────────────────────────────────────────────────────
export const gamificationRouter = router({
  // Get full game profile
  profile: protectedProcedure.input(z.object({})).query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const stats = await getGameStats(userId);
    const levelInfo = getLevelInfo(stats.totalIncome);

    // Today's completed income
    const db = await getDb();
    let todayIncome = 0;
    let completedToday = 0;
    if (db) {
      const todayStr = new Date().toISOString().substring(0, 10);
      const allUserOrders = await db
        .select({ amount: orders.amount, completedAt: orders.completedAt, status: orders.status, settleDate: orders.settleDate })
        .from(orders)
        .where(eq(orders.userId, userId));
      // completedToday: orders whose completedAt is today
      const todayCompleted = allUserOrders.filter(o =>
        (o.completedAt || "").startsWith(todayStr)
      );
      completedToday = todayCompleted.length;
      // todayIncome: orders that are 已结算 AND settleDate is today
      const settledToday = allUserOrders.filter(o =>
        o.status === "已结算" && (o.settleDate || "").startsWith(todayStr)
      );
      todayIncome = settledToday.reduce((sum, o) => {
        const amt = parseFloat(o.amount || "0");
        return sum + (isNaN(amt) ? 0 : amt);
      }, 0);
    }

    const conquestPhrase = getConquestPhrase(stats.totalIncome, todayIncome, completedToday);

    // Achievements
    const unlockedAchievements = ACHIEVEMENTS
      .filter(a => a.check(stats))
      .map(a => ({ id: a.id, name: a.name, emoji: a.emoji, desc: a.desc }));

    return {
      ...levelInfo,
      streakDays: stats.streakDays,
      totalCompleted: stats.totalCompleted,
      thisMonthIncome: stats.thisMonthIncome,
      todayIncome,
      completedToday,
      conquestPhrase,
      achievements: unlockedAchievements,
      allAchievements: ACHIEVEMENTS.map(a => ({
        id: a.id, name: a.name, emoji: a.emoji, desc: a.desc,
        unlocked: a.check(stats),
      })),
    };
  }),

  // Set weekly or monthly goal and get AI breakdown
  setGoal: protectedProcedure
    .input(z.object({
      type: z.enum(["weekly", "monthly"]),
      targetIncome: z.number().min(0),
      targetOrders: z.number().min(0).optional(),
      note: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const stats = await getGameStats(userId);
      const levelInfo = getLevelInfo(stats.totalIncome);

      // AI breakdown
      const now = new Date();
      const periodLabel = input.type === "weekly"
        ? `本周（${7} 天）`
        : `本月（${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()} 天）`;

      const remainingDays = input.type === "weekly"
        ? 7 - now.getDay()
        : new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1;

      const prompt = `你是一个活泼有趣的写手助理，说话风格俏皮、充满鼓励。
用户是一位写手，目前等级是"${levelInfo.title}"，累计收入 ¥${stats.totalIncome.toLocaleString()}。
用户设定了${periodLabel}的目标：
- 目标收入：¥${input.targetIncome.toLocaleString()}
- 目标订单数：${input.targetOrders ?? "不限"}
- 备注：${input.note ?? "无"}
- 剩余天数：${remainingDays} 天

请帮用户：
1. 分析目标是否合理（参考历史收入水平）
2. 拆解为每日建议（每天需要完成多少金额/订单）
3. 给出2-3条具体的执行建议
4. 用"法师大人"的称呼，语气活泼鼓励，加一些魔法主题的表情

输出格式：直接输出 markdown，不超过300字。`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "你是写手工作规划助手，风格活泼有趣，善用魔法主题比喻。" },
          { role: "user", content: prompt },
        ],
      });

      const breakdown = response.choices?.[0]?.message?.content ?? "目标设定成功！法师大人加油！";

      return {
        success: true,
        goal: input,
        breakdown,
        remainingDays,
        dailyTarget: input.targetIncome / remainingDays,
      };
    }),

  // Get monthly income chart data
  monthlyChart: protectedProcedure.input(z.object({})).query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { months: [] };

    const allOrders = await db
      .select({ amount: orders.amount, settleDate: orders.settleDate, completedAt: orders.completedAt, status: orders.status })
      .from(orders)
      .where(eq(orders.userId, ctx.user.id));

    // Group by month
    const monthMap: Record<string, { income: number; count: number }> = {};
    const completedStatuses = ["已完成", "待结算", "已结算"];

    for (const o of allOrders) {
      if (!completedStatuses.includes(o.status)) continue;
      const dateStr = o.settleDate || o.completedAt || "";
      const month = dateStr.substring(0, 7); // YYYY-MM
      if (!month || month.length < 7) continue;
      if (!monthMap[month]) monthMap[month] = { income: 0, count: 0 };
      const amt = parseFloat(o.amount || "0");
      if (!isNaN(amt)) {
        monthMap[month].income += amt;
        monthMap[month].count += 1;
      }
    }

    const months = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12) // last 12 months
      .map(([month, data]) => ({
        month,
        income: Math.round(data.income * 100) / 100,
        count: data.count,
      }));

    return { months };
  }),

  // Get client service ranking
  clientRank: protectedProcedure.input(z.object({})).query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { ranks: [] };

    const allOrders = await db
      .select({ clientService: orders.clientService, amount: orders.amount, status: orders.status })
      .from(orders)
      .where(eq(orders.userId, ctx.user.id));

    const completedStatuses = ["已完成", "待结算", "已结算"];
    const clientMap: Record<string, { income: number; count: number }> = {};

    for (const o of allOrders) {
      if (!completedStatuses.includes(o.status)) continue;
      const client = (o.clientService || "未知").trim();
      if (!client) continue;
      if (!clientMap[client]) clientMap[client] = { income: 0, count: 0 };
      const amt = parseFloat(o.amount || "0");
      if (!isNaN(amt)) {
        clientMap[client].income += amt;
        clientMap[client].count += 1;
      }
    }

    const ranks = Object.entries(clientMap)
      .sort(([, a], [, b]) => b.income - a.income)
      .slice(0, 10)
      .map(([name, data], idx) => ({
        rank: idx + 1,
        name,
        income: Math.round(data.income * 100) / 100,
        count: data.count,
      }));

    return { ranks };
  }),
});
