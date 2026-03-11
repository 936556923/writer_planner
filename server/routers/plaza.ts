import { z } from "zod";
import { desc, eq, and, gte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  ownerStatus, danmaku, announcements, giftRecords, coinGrants, paymentQR, users
} from "../../drizzle/schema";
import { storagePut } from "../storage";
import { broadcastDanmaku, broadcastGift, broadcastStatus, broadcastAnnouncement, broadcastCoinsUpdate } from "../socketServer";

// Gift costs in coins
const GIFT_COSTS: Record<string, number> = {
  flower: 10,
  cake: 50,
  drumstick: 30,
  crystal: 100,
  magic_wand: 200,
  crown: 500,
};

const STATUS_LABELS: Record<string, string> = {
  working: "副本中",
  eating: "吃饭中",
  playing_dog: "玩狗中",
  slacking: "摸鱼中",
  dungeon: "副本中",
  sleeping: "睡觉中",
};

export const plazaRouter = router({
  // ── Owner Status ──────────────────────────────────────────────────────────────
  getStatus: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { status: "working", customMessage: null, updatedAt: new Date() };
    const rows = await db.select().from(ownerStatus).limit(1);
    if (rows.length === 0) {
      await db.insert(ownerStatus).values({ status: "working" });
      return { status: "working", customMessage: null, updatedAt: new Date() };
    }
    return rows[0];
  }),

  setStatus: protectedProcedure
    .input(z.object({
      status: z.enum(["working", "eating", "playing_dog", "slacking", "dungeon", "sleeping"]),
      customMessage: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "只有管理员才能设置状态" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(ownerStatus).limit(1);
      if (rows.length === 0) {
        await db.insert(ownerStatus).values({ status: input.status, customMessage: input.customMessage ?? null });
      } else {
        await db.update(ownerStatus)
          .set({ status: input.status, customMessage: input.customMessage ?? null })
          .where(eq(ownerStatus.id, rows[0].id));
      }
      // Broadcast status change to all connected clients
      broadcastStatus({ status: input.status, customMessage: input.customMessage ?? null });
      return { success: true };
    }),

  // ── Announcements ─────────────────────────────────────────────────────────────
  listAnnouncements: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(announcements).orderBy(desc(announcements.isPinned), desc(announcements.createdAt)).limit(20);
  }),

  createAnnouncement: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(100),
      content: z.string().min(1),
      isPinned: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "只有管理员才能发布公告" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(announcements).values({
        title: input.title,
        content: input.content,
        isPinned: input.isPinned,
      });
      broadcastAnnouncement({ id: 0, title: input.title, content: input.content, isPinned: input.isPinned });
      return { success: true };
    }),

  deleteAnnouncement: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(announcements).where(eq(announcements.id, input.id));
      return { success: true };
    }),

  // ── Danmaku (recent history for new joiners) ──────────────────────────────────
  recentDanmaku: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const since = new Date(Date.now() - 10 * 60 * 1000); // last 10 min
    return db.select({
      id: danmaku.id,
      content: danmaku.content,
      color: danmaku.color,
      createdAt: danmaku.createdAt,
      senderName: users.displayName,
    })
      .from(danmaku)
      .leftJoin(users, eq(danmaku.userId, users.id))
      .where(gte(danmaku.createdAt, since))
      .orderBy(desc(danmaku.createdAt))
      .limit(50);
  }),

  sendDanmaku: protectedProcedure
    .input(z.object({
      content: z.string().min(1).max(100),
      color: z.string().optional().default("#ffffff"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(danmaku).values({
        userId: ctx.user.id,
        content: input.content,
        color: input.color,
      });
      const payload = {
        id: (result as any).insertId,
        content: input.content,
        color: input.color,
        senderName: ctx.user.displayName ?? ctx.user.name ?? "居民",
        createdAt: new Date(),
      };
      // Broadcast to all connected clients via WebSocket
      broadcastDanmaku(payload);
      return payload;
    }),

  // ── Gifts ─────────────────────────────────────────────────────────────────────
  sendGift: protectedProcedure
    .input(z.object({
      giftType: z.enum(["flower", "cake", "drumstick", "crystal", "magic_wand", "crown"]),
      message: z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const cost = GIFT_COSTS[input.giftType] ?? 10;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Check balance
      const [userRow] = await db.select({ coins: users.coins }).from(users).where(eq(users.id, ctx.user.id));
      if (!userRow || userRow.coins < cost) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `金币不足，需要 ${cost} 金币` });
      }

      // Deduct coins
      await db.update(users).set({ coins: userRow.coins - cost }).where(eq(users.id, ctx.user.id));

      // Record gift
      await db.insert(giftRecords).values({
        senderId: ctx.user.id,
        giftType: input.giftType,
        coinsCost: cost,
        message: input.message ?? null,
      });

      const giftPayload = {
        giftType: input.giftType,
        senderName: ctx.user.displayName ?? ctx.user.name ?? "居民",
        message: input.message ?? null,
      };
      broadcastGift(giftPayload);

      const newBalance = userRow.coins - cost;
      // Broadcast coin deduction to the sender
      broadcastCoinsUpdate({
        userId: ctx.user.id,
        newBalance,
        amount: -cost,
        senderName: "投喂扣除",
        recipientName: ctx.user.displayName ?? ctx.user.name ?? "居民",
        note: `投喂了 ${input.giftType}`,
      });

      return {
        success: true,
        newBalance,
        giftType: input.giftType,
        senderName: ctx.user.displayName ?? ctx.user.name ?? "居民",
      };
    }),

  giftHistory: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select({
      id: giftRecords.id,
      giftType: giftRecords.giftType,
      coinsCost: giftRecords.coinsCost,
      message: giftRecords.message,
      createdAt: giftRecords.createdAt,
      senderName: users.displayName,
    })
      .from(giftRecords)
      .leftJoin(users, eq(giftRecords.senderId, users.id))
      .orderBy(desc(giftRecords.createdAt))
      .limit(30);
  }),
  // ── Coin Grants (admin only) — ¥1 = 🪙×10 ────────────────────────────────────
  grantCoins: protectedProcedure
    .input(z.object({
      recipientId: z.number(),
      amount: z.number().min(1).max(999999),
      note: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "只有管理员才能发放金币" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get recipient current balance (owner can grant to themselves too)
      const [recipient] = await db.select({ coins: users.coins, displayName: users.displayName })
        .from(users).where(eq(users.id, input.recipientId));
      if (!recipient) throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });

      const newBalance = (recipient.coins ?? 0) + input.amount;

      // Add coins
      await db.update(users)
        .set({ coins: newBalance })
        .where(eq(users.id, input.recipientId));

      // Record grant
      await db.insert(coinGrants).values({
        grantedBy: ctx.user.id,
        recipientId: input.recipientId,
        amount: input.amount,
        note: input.note ?? null,
      });

      // Broadcast real-time coin update to ALL connected clients
      // Each client checks if userId matches their own id
      broadcastCoinsUpdate({
        userId: input.recipientId,
        newBalance,
        amount: input.amount,
        senderName: ctx.user.displayName || ctx.user.name || "法师大人",
        recipientName: recipient.displayName || "居民",
        note: input.note ?? null,
      });

      return { success: true, newBalance };
    }),

  coinGrantHistory: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) return [];
    return db.select({
      id: coinGrants.id,
      amount: coinGrants.amount,
      note: coinGrants.note,
      createdAt: coinGrants.createdAt,
      recipientName: users.displayName,
    })
      .from(coinGrants)
      .leftJoin(users, eq(coinGrants.recipientId, users.id))
      .orderBy(desc(coinGrants.createdAt))
      .limit(50);
  }),

  // ── All users list for admin coin granting ────────────────────────────────────
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) return [];
    return db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      name: users.name,
      role: users.role,
      coins: users.coins,
      createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.createdAt));
  }),

  updateUserRole: protectedProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(["admin", "assistant", "user"]),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "只有管理员才能修改角色" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  // ── Payment QR ────────────────────────────────────────────────────────────────
  getPaymentQR: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(paymentQR);
  }),

  upsertPaymentQR: protectedProcedure
    .input(z.object({
      platform: z.enum(["wechat", "alipay"]),
      imageUrl: z.string().url(),
      thankMessage: z.string().max(300).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db.select().from(paymentQR).where(eq(paymentQR.platform, input.platform));
      if (existing.length > 0) {
        await db.update(paymentQR)
          .set({ imageUrl: input.imageUrl, thankMessage: input.thankMessage ?? null })
          .where(eq(paymentQR.platform, input.platform));
      } else {
        await db.insert(paymentQR).values({
          platform: input.platform,
          imageUrl: input.imageUrl,
          thankMessage: input.thankMessage ?? null,
        });
      }
      return { success: true };
    }),

  // ── My coin balance ────────────────────────────────────────────────
  myCoins: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { coins: 0 };
    const [row] = await db.select({ coins: users.coins }).from(users).where(eq(users.id, ctx.user.id));
    return { coins: row?.coins ?? 0 };
  }),
});
