import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { ordersRouter } from "./routers/orders";
import { statsRouter } from "./routers/stats";
import { aiRouter } from "./routers/ai";
import { settingsRouter } from "./routers/settings";
import { importExportRouter } from "./routers/importExport";
import { gamificationRouter } from "./routers/gamification";
import { localAuthRouter } from "./routers/localAuth";
import { plazaRouter } from "./routers/plaza";
import { rpgRouter } from "./routers/rpg";
import { calendarRouter } from "./routers/calendar";
import { todoQuadrantRouter } from "./routers/todoQuadrant";
import { dropsRouter } from "./routers/drops";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  orders: ordersRouter,
  stats: statsRouter,
  ai: aiRouter,
  settings: settingsRouter,
  importExport: importExportRouter,
  game: gamificationRouter,
  localAuth: localAuthRouter,
  plaza: plazaRouter,
  rpg: rpgRouter,
  calendar: calendarRouter,
  todoQ: todoQuadrantRouter,
  drops: dropsRouter,
});

export type AppRouter = typeof appRouter;
