import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { characterProfiles, dailyQuests, storyArcs, users } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";

export const COMBAT_CLASSES = {
  mage:        { name: "法师",     emoji: "🔮", desc: "精通元素魔法，智慧超群" },
  warrior:     { name: "战士",     emoji: "⚔️",  desc: "铁甲护身，力大无穷" },
  rogue:       { name: "刺客",     emoji: "🗡️",  desc: "身法如风，暗影潜行" },
  archer:      { name: "弓手",     emoji: "🏹", desc: "百步穿杨，眼疾手快" },
  paladin:     { name: "圣骑士",   emoji: "🛡️",  desc: "神圣守护，正义化身" },
  necromancer: { name: "死灵法师", emoji: "💀", desc: "驾驭亡灵，神秘莫测" },
  owner:       { name: "法师大人", emoji: "✨", desc: "王国主宰，魔法无边" },
} as const;

export const LIFE_CLASSES = {
  blacksmith: { name: "铁匠",     emoji: "🔨", desc: "锻造神兵利器" },
  merchant:   { name: "商人",     emoji: "💰", desc: "走南闯北，精于算计" },
  chef:       { name: "厨师",     emoji: "🍳", desc: "烹饪美食，滋养王国" },
  farmer:     { name: "农夫",     emoji: "🌾", desc: "耕耘大地，丰衣足食" },
  scholar:    { name: "学者",     emoji: "📚", desc: "博览群书，智慧渊博" },
  bard:       { name: "吟游诗人", emoji: "🎵", desc: "以歌传情，游历四方" },
  alchemist:  { name: "炼金术士", emoji: "⚗️",  desc: "点石成金，调配药剂" },
  beggar:     { name: "乞丐",     emoji: "🥿", desc: "流浪王国，自由自在" },
} as const;

export const TAVERN_ACTIONS = {
  drinking:      "🍺 喝酒",
  playing_lute:  "🎸 弹琴",
  chatting:      "💬 聊天",
  sleeping:      "😴 打盹",
  arm_wrestling: "💪 掰手腕",
  reading:       "📖 看书",
} as const;

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const rpgRouter = router({
  // ── Get character profile ──────────────────────────────────────────────────
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { profile: null, combatClasses: COMBAT_CLASSES, lifeClasses: LIFE_CLASSES, tavernActions: TAVERN_ACTIONS };
    const [profile] = await db
      .select()
      .from(characterProfiles)
      .where(eq(characterProfiles.userId, ctx.user.id))
      .limit(1);
    return {
      profile: profile ?? null,
      combatClasses: COMBAT_CLASSES,
      lifeClasses: LIFE_CLASSES,
      tavernActions: TAVERN_ACTIONS,
    };
  }),

  // ── Setup profile (first time) ─────────────────────────────────────────────
  setupProfile: protectedProcedure
    .input(z.object({
      nickname: z.string().min(1).max(20),
      combatClass: z.enum(["mage", "warrior", "rogue", "archer", "paladin", "necromancer", "owner"]),
      lifeClass: z.enum(["blacksmith", "merchant", "chef", "farmer", "scholar", "bard", "alchemist", "beggar"]),
      avatarConfig: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const isOwner = ctx.user.role === "admin";
      const combatClass = isOwner ? "owner" : input.combatClass;

      const [existing] = await db
        .select()
        .from(characterProfiles)
        .where(eq(characterProfiles.userId, ctx.user.id))
        .limit(1);

      if (existing) {
        await db.update(characterProfiles)
          .set({
            nickname: input.nickname,
            lifeClass: input.lifeClass as any,
            avatarConfig: input.avatarConfig ?? existing.avatarConfig,
            profileSetupDone: true,
            updatedAt: new Date(),
          })
          .where(eq(characterProfiles.userId, ctx.user.id));
      } else {
        await db.insert(characterProfiles).values({
          userId: ctx.user.id,
          nickname: input.nickname,
          combatClass: combatClass as any,
          lifeClass: input.lifeClass as any,
          avatarConfig: input.avatarConfig ?? null,
          profileSetupDone: true,
          level: 1,
          exp: 0,
        });
        await db.insert(storyArcs).values({
          userId: ctx.user.id,
          arcTitle: `${input.nickname}的冒险传说`,
          historyLog: JSON.stringify([]),
          currentChapter: 1,
          totalDaysPlayed: 0,
        });
      }
      return { success: true };
    }),

  // ── Update profile ─────────────────────────────────────────────────────────
  updateProfile: protectedProcedure
    .input(z.object({
      nickname: z.string().min(1).max(20).optional(),
      lifeClass: z.enum(["blacksmith", "merchant", "chef", "farmer", "scholar", "bard", "alchemist", "beggar"]).optional(),
      avatarConfig: z.string().optional(),
      tavernAction: z.enum(["drinking", "playing_lute", "chatting", "sleeping", "arm_wrestling", "reading"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(characterProfiles)
        .set({
          ...(input.nickname !== undefined && { nickname: input.nickname }),
          ...(input.lifeClass !== undefined && { lifeClass: input.lifeClass as any }),
          ...(input.avatarConfig !== undefined && { avatarConfig: input.avatarConfig }),
          ...(input.tavernAction !== undefined && { tavernAction: input.tavernAction as any }),
          updatedAt: new Date(),
        })
        .where(eq(characterProfiles.userId, ctx.user.id));
      return { success: true };
    }),

  // ── Get today's quest ─────────────────────────────────────────────────────
  getTodayQuest: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const today = todayStr();
    const [quest] = await db
      .select()
      .from(dailyQuests)
      .where(and(eq(dailyQuests.userId, ctx.user.id), eq(dailyQuests.date, today)))
      .limit(1);
    return quest ?? null;
  }),

  // ── Generate today's quest via AI ─────────────────────────────────────────
  generateTodayQuest: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const today = todayStr();

    const [existing] = await db
      .select()
      .from(dailyQuests)
      .where(and(eq(dailyQuests.userId, ctx.user.id), eq(dailyQuests.date, today)))
      .limit(1);
    if (existing) return existing;

    const [profile] = await db
      .select()
      .from(characterProfiles)
      .where(eq(characterProfiles.userId, ctx.user.id))
      .limit(1);

    if (!profile) throw new TRPCError({ code: "BAD_REQUEST", message: "请先完成角色设置" });

    const [arc] = await db
      .select()
      .from(storyArcs)
      .where(eq(storyArcs.userId, ctx.user.id))
      .limit(1);

    const combatInfo = COMBAT_CLASSES[profile.combatClass as keyof typeof COMBAT_CLASSES];
    const lifeInfo = LIFE_CLASSES[profile.lifeClass as keyof typeof LIFE_CLASSES];
    const historyLog: Array<{date: string; summary: string; choice: string}> = arc ? JSON.parse(arc.historyLog ?? "[]") : [];
    const recentHistory = historyLog.slice(-5).map(h => `${h.date}: ${h.summary}`).join("\n");

    const isOwner = profile.combatClass === "owner";
    const systemPrompt = isOwner
      ? `你是小炮王国的故事生成器。小炮大人是王国的法师大人，拥有无上魔法。请生成一段今日的法师大人视角的王国日常剧情，充满魔法、幽默和温馨。剧情要围绕王国日常事务、居民互动、魔法研究等展开。150-200字。`
      : `你是小炮王国的故事生成器。请为以下角色生成今日冒险剧情：
角色名：${profile.nickname}
战斗职业：${combatInfo?.name}（${combatInfo?.desc}）
生活职业：${lifeInfo?.name}（${lifeInfo?.desc}）
历史记录：${recentHistory || "这是第一天的冒险"}

要求：
1. 剧情发生在小炮王国内，与王国日常生活相关
2. 200-300字，文笔生动有趣，带有RPG感
3. 结尾必须出现一个需要做选择的关键节点
4. 不要直接给出选项，只写剧情`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `请生成${today}的冒险剧情` },
      ],
    });

    const storyText = response.choices[0].message.content as string;

    if (isOwner) {
      const [newQuest] = await db.insert(dailyQuests).values({
        userId: ctx.user.id,
        date: today,
        storyText,
        stage: "completed",
        choices: JSON.stringify([]),
        expReward: 30,
        coinReward: 0,
        rewardClaimed: false,
      }).$returningId();

      if (arc) {
        const newLog = [...historyLog, { date: today, summary: storyText.substring(0, 50) + "…", choice: "法师大人的日常" }];
        await db.update(storyArcs)
          .set({ historyLog: JSON.stringify(newLog), totalDaysPlayed: (arc.totalDaysPlayed ?? 0) + 1, updatedAt: new Date() })
          .where(eq(storyArcs.userId, ctx.user.id));
      }

      const [created] = await db.select().from(dailyQuests).where(eq(dailyQuests.id, (newQuest as any).insertId)).limit(1);
      return created;
    }

    // Generate choices for non-owner
    const choiceResponse = await invokeLLM({
      messages: [
        { role: "system", content: "你是小炮王国的故事生成器。根据以下剧情，生成2-3个选项供玩家选择。每个选项要有不同的走向和风格（勇敢/谨慎/搞笑等）。" },
        { role: "user", content: `剧情：${storyText}\n\n请生成JSON格式的选项数组，格式：[{"id":"A","text":"选项文字（20字内）","effect":"选择后的简短效果描述（10字内）","expReward":数字,"coinReward":数字}]，expReward范围10-50，coinReward范围0-20` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "quest_choices",
          strict: true,
          schema: {
            type: "object",
            properties: {
              choices: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    text: { type: "string" },
                    effect: { type: "string" },
                    expReward: { type: "integer" },
                    coinReward: { type: "integer" },
                  },
                  required: ["id", "text", "effect", "expReward", "coinReward"],
                  additionalProperties: false,
                },
              },
            },
            required: ["choices"],
            additionalProperties: false,
          },
        },
      },
    });

    const choicesData = JSON.parse(choiceResponse.choices[0].message.content as string);

    const [newQuest] = await db.insert(dailyQuests).values({
      userId: ctx.user.id,
      date: today,
      storyText,
      stage: "choice",
      choices: JSON.stringify(choicesData.choices),
      expReward: 0,
      coinReward: 0,
      rewardClaimed: false,
    }).$returningId();

    const [created] = await db.select().from(dailyQuests).where(eq(dailyQuests.id, (newQuest as any).insertId)).limit(1);
    return created;
  }),

  // ── Submit choice ──────────────────────────────────────────────────────────
  submitChoice: protectedProcedure
    .input(z.object({ questId: z.number(), choiceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [quest] = await db
        .select()
        .from(dailyQuests)
        .where(and(eq(dailyQuests.id, input.questId), eq(dailyQuests.userId, ctx.user.id)))
        .limit(1);

      if (!quest) throw new TRPCError({ code: "NOT_FOUND" });
      if (quest.stage !== "choice") throw new TRPCError({ code: "BAD_REQUEST", message: "当前阶段无法选择" });

      const choices: Array<{id: string; text: string; effect: string; expReward: number; coinReward: number}> = JSON.parse(quest.choices ?? "[]");
      const selected = choices.find(c => c.id === input.choiceId);
      if (!selected) throw new TRPCError({ code: "BAD_REQUEST", message: "无效选项" });

      const [profile] = await db.select().from(characterProfiles).where(eq(characterProfiles.userId, ctx.user.id)).limit(1);
      const combatInfo = COMBAT_CLASSES[profile?.combatClass as keyof typeof COMBAT_CLASSES];

      const outcomeResponse = await invokeLLM({
        messages: [
          { role: "system", content: "你是小炮王国的故事生成器。根据玩家的选择，生成100-150字的结局描述，要有趣、有画面感，并总结今日冒险的收获。" },
          { role: "user", content: `剧情：${quest.storyText}\n玩家选择：${selected.text}\n职业：${combatInfo?.name}\n\n请生成选择后的结局描述` },
        ],
      });

      const outcomeText = outcomeResponse.choices[0].message.content as string;

      await db.update(dailyQuests)
        .set({
          stage: "outcome",
          selectedChoice: input.choiceId,
          outcomeText,
          expReward: selected.expReward,
          coinReward: selected.coinReward,
          updatedAt: new Date(),
        })
        .where(eq(dailyQuests.id, input.questId));

      const [arc] = await db.select().from(storyArcs).where(eq(storyArcs.userId, ctx.user.id)).limit(1);
      if (arc) {
        const historyLog: Array<{date: string; summary: string; choice: string}> = JSON.parse(arc.historyLog ?? "[]");
        const newLog = [...historyLog, {
          date: quest.date,
          summary: quest.storyText.substring(0, 50) + "…",
          choice: selected.text,
        }];
        await db.update(storyArcs)
          .set({ historyLog: JSON.stringify(newLog), totalDaysPlayed: (arc.totalDaysPlayed ?? 0) + 1, updatedAt: new Date() })
          .where(eq(storyArcs.userId, ctx.user.id));
      }

      return { outcomeText, expReward: selected.expReward, coinReward: selected.coinReward };
    }),

  // ── Claim reward ───────────────────────────────────────────────────────────
  claimReward: protectedProcedure
    .input(z.object({ questId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [quest] = await db
        .select()
        .from(dailyQuests)
        .where(and(eq(dailyQuests.id, input.questId), eq(dailyQuests.userId, ctx.user.id)))
        .limit(1);

      if (!quest) throw new TRPCError({ code: "NOT_FOUND" });
      if (quest.rewardClaimed) throw new TRPCError({ code: "BAD_REQUEST", message: "奖励已领取" });
      if (quest.stage !== "outcome" && quest.stage !== "completed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "请先完成今日冒险" });
      }

      const [profile] = await db.select().from(characterProfiles).where(eq(characterProfiles.userId, ctx.user.id)).limit(1);
      if (profile) {
        const newExp = (profile.exp ?? 0) + (quest.expReward ?? 0);
        const newLevel = Math.floor(newExp / 100) + 1;
        await db.update(characterProfiles)
          .set({ exp: newExp, level: newLevel, updatedAt: new Date() })
          .where(eq(characterProfiles.userId, ctx.user.id));
      }

      if ((quest.coinReward ?? 0) > 0) {
        await db.execute(
          `UPDATE users SET coins = coins + ${quest.coinReward} WHERE id = ${ctx.user.id}`
        );
      }

      await db.update(dailyQuests)
        .set({ stage: "completed", rewardClaimed: true, updatedAt: new Date() })
        .where(eq(dailyQuests.id, input.questId));

      return { success: true, expGained: quest.expReward, coinsGained: quest.coinReward };
    }),

  // ── Get tavern online characters ──────────────────────────────────────────
  getTavernOnline: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const profiles = await db
      .select({
        id: characterProfiles.id,
        userId: characterProfiles.userId,
        nickname: characterProfiles.nickname,
        combatClass: characterProfiles.combatClass,
        lifeClass: characterProfiles.lifeClass,
        avatarConfig: characterProfiles.avatarConfig,
        tavernAction: characterProfiles.tavernAction,
        level: characterProfiles.level,
      })
      .from(characterProfiles)
      .where(eq(characterProfiles.profileSetupDone, true))
      .limit(20);

    return profiles.map(p => ({
      ...p,
      combatInfo: COMBAT_CLASSES[p.combatClass as keyof typeof COMBAT_CLASSES] ?? COMBAT_CLASSES.mage,
      lifeInfo: LIFE_CLASSES[p.lifeClass as keyof typeof LIFE_CLASSES] ?? LIFE_CLASSES.merchant,
      actionLabel: TAVERN_ACTIONS[p.tavernAction as keyof typeof TAVERN_ACTIONS] ?? "🍺 喝酒",
    }));
  }),

  // ── Get story arc ──────────────────────────────────────────────
  getStoryArc: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const [arc] = await db
      .select()
      .from(storyArcs)
      .where(eq(storyArcs.userId, ctx.user.id))
      .limit(1);
    return arc ?? null;
  }),
});
