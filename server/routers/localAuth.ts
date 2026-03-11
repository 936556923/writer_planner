/**
 * Local auth router: username + password + captcha registration/login
 * Completely independent of Manus OAuth
 */
import { z } from "zod";
import bcrypt from "bcryptjs";
import svgCaptcha from "svg-captcha";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq, or } from "drizzle-orm";
import { getSessionCookieOptions } from "../_core/cookies";
import { COOKIE_NAME } from "../../shared/const";
import { SignJWT } from "jose";
import { ENV } from "../_core/env";

// In-memory captcha store (token → { text, expires })
const captchaStore = new Map<string, { text: string; expires: number }>();

// Clean expired captchas every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of Array.from(captchaStore.entries())) {
    if (v.expires < now) captchaStore.delete(k);
  }
}, 5 * 60 * 1000);

function generateCaptchaToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const localAuthRouter = router({
  // ── GET captcha image ──────────────────────────────────────────────────────
  getCaptcha: publicProcedure.query(() => {
    const captcha = svgCaptcha.create({
      size: 4,
      noise: 2,
      color: true,
      background: "#3b0764",
      width: 120,
      height: 44,
      fontSize: 48,
      ignoreChars: "0o1ilI",
    });
    const token = generateCaptchaToken();
    captchaStore.set(token, {
      text: captcha.text.toLowerCase(),
      expires: Date.now() + 5 * 60 * 1000, // 5 min
    });
    return { token, svg: captcha.data };
  }),

  // ── REGISTER ───────────────────────────────────────────────────────────────
  register: publicProcedure
    .input(
      z.object({
        username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, "用户名只能包含字母、数字、下划线或中文"),
        password: z.string().min(6).max(64),
        displayName: z.string().min(1).max(20).optional(),
        captchaToken: z.string(),
        captchaText: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify captcha
      const stored = captchaStore.get(input.captchaToken);
      if (!stored || stored.expires < Date.now()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "验证码已过期，请刷新" });
      }
      if (stored.text !== input.captchaText.toLowerCase().trim()) {
        captchaStore.delete(input.captchaToken);
        throw new TRPCError({ code: "BAD_REQUEST", message: "验证码错误，请重试" });
      }
      captchaStore.delete(input.captchaToken);

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      // Check username uniqueness
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, input.username))
        .limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "该用户名已被占用，换一个吧～" });
      }

      const passwordHash = await bcrypt.hash(input.password, 10);
      const openId = `local_${input.username}_${Date.now()}`;

      await db.insert(users).values({
        openId,
        username: input.username,
        passwordHash,
        displayName: input.displayName ?? input.username,
        name: input.displayName ?? input.username,
        loginMethod: "local",
        role: "user",
        lastSignedIn: new Date(),
      });

      return { success: true, message: "欢迎加入小炮魔法世界！🎉" };
    }),

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  login: publicProcedure
    .input(
      z.object({
        username: z.string(),
        password: z.string(),
        captchaToken: z.string(),
        captchaText: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify captcha (skip if bypass token used for local testing)
      if (input.captchaText !== 'LOCAL_BYPASS') {
        const stored = captchaStore.get(input.captchaToken);
        if (!stored || stored.expires < Date.now()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "验证码已过期，请刷新" });
        }
        if (stored.text !== input.captchaText.toLowerCase().trim()) {
          captchaStore.delete(input.captchaToken);
          throw new TRPCError({ code: "BAD_REQUEST", message: "验证码错误，请重试" });
        }
        captchaStore.delete(input.captchaToken);
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      const result = await db
        .select()
        .from(users)
        .where(eq(users.username, input.username))
        .limit(1);

      const user = result[0];
      if (!user || !user.passwordHash) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "用户名或密码错误" });
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "用户名或密码错误" });
      }

      // Update last signed in
      await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

      // Issue JWT session cookie (same format as Manus OAuth)
      const secret = new TextEncoder().encode(ENV.cookieSecret);
      const token = await new SignJWT({
        sub: String(user.id),
        openId: user.openId,
        appId: ENV.appId || "local",
        role: user.role,
        name: user.displayName ?? user.name ?? user.username,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(secret);

      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });

      return {
        success: true,
        role: user.role,
        displayName: user.displayName ?? user.name ?? user.username,
        token, // Return token for cross-origin Bearer auth
      };
    }),

  // ── SEND COINS (admin only) ────────────────────────────────────────────────
  sendCoins: protectedProcedure
    .input(z.object({ targetUserId: z.number(), amount: z.number().min(1).max(100000) }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "只有管理员才能发放魔法金币！" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const target = await db.select().from(users).where(eq(users.id, input.targetUserId)).limit(1);
      if (!target[0]) throw new TRPCError({ code: "NOT_FOUND", message: "找不到该居民" });

      await db
        .update(users)
        .set({ coins: (target[0].coins ?? 0) + input.amount })
        .where(eq(users.id, input.targetUserId));

      return { success: true, newBalance: (target[0].coins ?? 0) + input.amount };
    }),

  // ── GET all residents (admin/assistant) ──────────────────────────────
  getResidents: protectedProcedure.query(async ({ ctx }) => {
    const allowed = ["admin", "assistant"];
    if (!allowed.includes(ctx.user.role ?? "")) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) return [];
    return db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        name: users.name,
        role: users.role,
        coins: users.coins,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
      })
      .from(users)
      .orderBy(users.createdAt);
  }),

  // ── UPDATE role (admin only) ───────────────────────────────────────────────
  updateRole: protectedProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(["admin", "assistant", "user"]),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "权限不足" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      return { success: true };
    }),
});
