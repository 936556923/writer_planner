import { describe, expect, it, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock DB module to avoid real DB calls in unit tests
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  getOrders: vi.fn().mockResolvedValue({ orders: [], total: 0 }),
  getOrderById: vi.fn().mockResolvedValue(null),
  createOrder: vi.fn().mockResolvedValue({ id: 1, orderId: "TEST-001", status: "待开始" }),
  updateOrder: vi.fn().mockResolvedValue({ id: 1, orderId: "TEST-001", status: "进行中" }),
  deleteOrder: vi.fn().mockResolvedValue(undefined),
  getOrderNotes: vi.fn().mockResolvedValue([]),
  addOrderNote: vi.fn().mockResolvedValue({ id: 1, content: "Test note", type: "normal" }),
  deleteOrderNote: vi.fn().mockResolvedValue(undefined),
  getStats: vi.fn().mockResolvedValue({
    totalOrders: 0,
    totalSettled: 0,
    totalPending: 0,
    thisMonthIncome: 0,
    thisMonthOrders: 0,
    overdueOrders: 0,
    urgentOrders: 0,
    statusCounts: {},
    monthlyIncome: [],
    weeklyOrders: [],
    clientServiceRank: [],
    designerRank: [],
  }),
  getUserConfig: vi.fn().mockResolvedValue(null),
  upsertUserConfig: vi.fn().mockResolvedValue(undefined),
  getDailyGoal: vi.fn().mockResolvedValue(null),
  upsertDailyGoal: vi.fn().mockResolvedValue(undefined),
  getAuthorizationsForAdmin: vi.fn().mockResolvedValue([]),
  getAuthorizationsForAssistant: vi.fn().mockResolvedValue([]),
  grantAssistant: vi.fn().mockResolvedValue(undefined),
  revokeAssistant: vi.fn().mockResolvedValue(undefined),
  getAllUsers: vi.fn().mockResolvedValue([]),
  updateUserRole: vi.fn().mockResolvedValue(undefined),
  getAiPlans: vi.fn().mockResolvedValue([]),
  getAiPlanById: vi.fn().mockResolvedValue(null),
  saveAiPlan: vi.fn().mockResolvedValue({ id: 1 }),
  getOrdersForUser: vi.fn().mockResolvedValue([]),
  getOrderMeta: vi.fn().mockResolvedValue({ clientServices: [], designers: [] }),
  batchDeleteOrders: vi.fn().mockResolvedValue(undefined),
  batchUpdateOrderStatus: vi.fn().mockResolvedValue(undefined),
  getTodayTasks: vi.fn().mockResolvedValue([]),
  getTodaySummary: vi.fn().mockResolvedValue({ completedToday: 0, completedIncome: 0, pendingSettlement: 0 }),
  getRangeSummary: vi.fn().mockResolvedValue({ completed: 0, income: 0, newOrders: 0, statusBreakdown: {}, totalActive: 0 }),
  isAssistantAuthorized: vi.fn().mockResolvedValue(false),
  getMeta: vi.fn().mockResolvedValue({ clientServices: [], designers: [], statuses: [] }),
  getNotesByOrderId: vi.fn().mockResolvedValue([]),
  createNote: vi.fn().mockResolvedValue({ id: 1, content: "note", type: "normal" }),
  updateNote: vi.fn().mockResolvedValue(undefined),
  deleteNote: vi.fn().mockResolvedValue(undefined),
  getAllOrdersForUser: vi.fn().mockResolvedValue([]),
  getOrdersByIds: vi.fn().mockResolvedValue([]),
  deleteAiPlan: vi.fn().mockResolvedValue(undefined),
}));

function makeAdminCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-open-id",
      name: "Admin User",
      email: "admin@example.com",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeUserCtx(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "user-open-id",
      name: "Regular User",
      email: "user@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("auth.me", () => {
  it("returns current user when authenticated", async () => {
    const ctx = makeAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.role).toBe("admin");
  });

  it("returns null for unauthenticated request", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const ctx = makeAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});

describe("orders.list", () => {
  it("requires authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.orders.list({})).rejects.toThrow();
  });

  it("returns empty list for new user", async () => {
    const ctx = makeUserCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.orders.list({});
    expect(result.orders).toEqual([]);
  });
});

describe("stats.get", () => {
  it("requires authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.stats.get({})).rejects.toThrow();
  });

  it("returns stats object for authenticated user", async () => {
    const ctx = makeAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.stats.get({});
    expect(result).toHaveProperty("totalOrders");
    expect(result).toHaveProperty("statusCounts");
    expect(result).toHaveProperty("monthlyIncome");
  });
});

describe("settings.getConfig", () => {
  it("returns default config for new user", async () => {
    const ctx = makeUserCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.settings.getConfig({});
    expect(result).toHaveProperty("wordsPerHour");
    expect(result).toHaveProperty("workHoursPerDay");
    expect(result.wordsPerHour).toBeGreaterThan(0);
  });
});

describe("orders.todayTasks", () => {
  it("requires authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.orders.todayTasks({})).rejects.toThrow();
  });

  it("returns empty array for new user", async () => {
    const ctx = makeUserCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.orders.todayTasks({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("orders.todaySummary", () => {
  it("returns summary with completedToday field", async () => {
    const ctx = makeAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.orders.todaySummary({});
    expect(result).toHaveProperty("completedToday");
    expect(result).toHaveProperty("completedIncome");
    expect(result).toHaveProperty("pendingSettlement");
  });
});

describe("orders.markComplete", () => {
  it("returns NOT_FOUND when order does not exist", async () => {
    const ctx = makeAdminCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.orders.markComplete({ id: 9999 })).rejects.toThrow();
  });
});

describe("settings.updateUserRole", () => {
  it("allows admin to update user role", async () => {
    const ctx = makeAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.settings.updateUserRole({ userId: 2, role: "assistant" });
    expect(result.success).toBe(true);
  });

  it("rejects non-admin role update", async () => {
    const ctx = makeUserCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.settings.updateUserRole({ userId: 3, role: "admin" })).rejects.toThrow();
  });
});
