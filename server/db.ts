import { and, eq, inArray, like, or, desc, asc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  orders,
  notes,
  dailyGoals,
  aiPlans,
  userConfigs,
  assistantAuthorizations,
  type Order,
  type Note,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ── Users ──────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }

  // Owner always gets admin role (owner+admin merged into admin)
  if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  } else if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      openId: users.openId,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "user" | "admin" | "assistant") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ── Assistant Authorizations ───────────────────────────────────────────────────
export async function getAuthorizationsForAdmin(adminId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: assistantAuthorizations.id,
      assistantId: assistantAuthorizations.assistantId,
      assistantName: users.name,
      assistantEmail: users.email,
      createdAt: assistantAuthorizations.createdAt,
    })
    .from(assistantAuthorizations)
    .leftJoin(users, eq(users.id, assistantAuthorizations.assistantId))
    .where(eq(assistantAuthorizations.adminId, adminId));
}

export async function getAuthorizationsForAssistant(assistantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: assistantAuthorizations.id,
      adminId: assistantAuthorizations.adminId,
      adminName: users.name,
      adminEmail: users.email,
      createdAt: assistantAuthorizations.createdAt,
    })
    .from(assistantAuthorizations)
    .leftJoin(users, eq(users.id, assistantAuthorizations.adminId))
    .where(eq(assistantAuthorizations.assistantId, assistantId));
}

export async function createAuthorization(adminId: number, assistantId: number) {
  const db = await getDb();
  if (!db) return;
  // Check if already exists
  const existing = await db
    .select()
    .from(assistantAuthorizations)
    .where(
      and(
        eq(assistantAuthorizations.adminId, adminId),
        eq(assistantAuthorizations.assistantId, assistantId)
      )
    )
    .limit(1);
  if (existing.length > 0) return existing[0];
  await db.insert(assistantAuthorizations).values({ adminId, assistantId });
}

export async function deleteAuthorization(adminId: number, assistantId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(assistantAuthorizations)
    .where(
      and(
        eq(assistantAuthorizations.adminId, adminId),
        eq(assistantAuthorizations.assistantId, assistantId)
      )
    );
}

export async function isAssistantAuthorized(assistantId: number, adminId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select()
    .from(assistantAuthorizations)
    .where(
      and(
        eq(assistantAuthorizations.assistantId, assistantId),
        eq(assistantAuthorizations.adminId, adminId)
      )
    )
    .limit(1);
  return result.length > 0;
}

// ── User Config ────────────────────────────────────────────────────────────────
export async function getUserConfig(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(userConfigs).where(eq(userConfigs.userId, userId)).limit(1);
  return result[0] ?? null;
}

export async function upsertUserConfig(
  userId: number,
  data: Partial<{
    deepseekKey: string;
    aiModel: string;
    wordsPerHour: number;
    workHoursPerDay: number;
    defaultStatus: string;
  }>
) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(userConfigs)
    .values({ userId, ...data })
    .onDuplicateKeyUpdate({ set: data });
}

// ── Orders ─────────────────────────────────────────────────────────────────────
export interface OrderFilters {
  userId: number;
  search?: string;
  status?: string;
  clientService?: string;
  settleStatus?: string;
  writingStatus?: string;
  submissionStatus?: string;
  sortBy?: string;
  sortDir?: "ASC" | "DESC";
  page?: number;
  pageSize?: number;
}

export async function getOrders(filters: OrderFilters) {
  const db = await getDb();
  if (!db) return { orders: [], total: 0 };

  const {
    userId,
    search,
    status,
    clientService,
    settleStatus,
    writingStatus,
    submissionStatus,
    sortBy = "createdAt",
    sortDir = "DESC",
    page = 1,
    pageSize = 200,
  } = filters;

  const conditions = [eq(orders.userId, userId)];

  if (status && status !== "all") {
    conditions.push(eq(orders.status, status as Order["status"]));
  }
  if (clientService && clientService !== "all") {
    conditions.push(eq(orders.clientService, clientService));
  }
  if (settleStatus && settleStatus !== "all") {
    conditions.push(eq(orders.settleStatus, settleStatus as any));
  }
  if (writingStatus && writingStatus !== "all") {
    conditions.push(eq(orders.writingStatus, writingStatus as any));
  }
  if (submissionStatus && submissionStatus !== "all") {
    conditions.push(eq(orders.submissionStatus, submissionStatus as any));
  }
  if (search && search.trim()) {
    const kw = `%${search.trim()}%`;
    conditions.push(
      or(
        like(orders.orderId, kw),
        like(orders.orderNo, kw),
        like(orders.designer, kw),
        like(orders.title, kw),
        like(orders.clientService, kw),
        like(orders.tags, kw)
      )!
    );
  }

  const where = and(...conditions);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validSortCols: Record<string, any> = {
    createdAt: orders.createdAt,
    updatedAt: orders.updatedAt,
    deadline: orders.deadline,
    amount: orders.amount,
    wordCount: orders.wordCount,
    priority: orders.priority,
  };
  const col = validSortCols[sortBy] ?? orders.createdAt;
  const orderBy = sortDir === "ASC" ? asc(col) : desc(col);

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(where)
    .orderBy(orderBy as any)
    .limit(pageSize)
    .offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)` }).from(orders).where(where),
  ]);

  const total = Number(countResult[0]?.count ?? 0);
  return { orders: rows, total };
}

export async function getOrderById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.userId, userId)))
    .limit(1);
  return result[0] ?? null;
}

export async function createOrder(data: Omit<typeof orders.$inferInsert, "id">) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(orders).values(data as any);
  const insertId = (result as any)[0]?.insertId ?? 0;
  return getOrderById(insertId, data.userId);
}

export async function updateOrder(id: number, userId: number, data: Partial<typeof orders.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(orders).set(data as any).where(and(eq(orders.id, id), eq(orders.userId, userId)));
  return getOrderById(id, userId);
}

export async function deleteOrder(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(orders).where(and(eq(orders.id, id), eq(orders.userId, userId)));
  await db.delete(notes).where(and(eq(notes.orderId, id), eq(notes.userId, userId)));
}

export async function batchDeleteOrders(ids: number[], userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(orders).where(and(inArray(orders.id, ids), eq(orders.userId, userId)));
  await db.delete(notes).where(and(inArray(notes.orderId, ids), eq(notes.userId, userId)));
}

export async function batchUpdateOrderStatus(ids: number[], userId: number, status: Order["status"]) {
  const db = await getDb();
  if (!db) return;
  const updateData: Partial<typeof orders.$inferInsert> = { status };
  if (status === "已完成" || status === "已结算") {
    updateData.completedAt = new Date().toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-");
  }
  await db.update(orders).set(updateData).where(and(inArray(orders.id, ids), eq(orders.userId, userId)));
}

export async function getAllOrdersForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
}

export async function getOrdersByIds(ids: number[], userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(and(inArray(orders.id, ids), eq(orders.userId, userId)));
}

// ── Notes ──────────────────────────────────────────────────────────────────────
export async function getNotesByOrderId(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notes).where(eq(notes.orderId, orderId)).orderBy(asc(notes.createdAt));
}

export async function createNote(data: Omit<typeof notes.$inferInsert, "id">) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(notes).values(data);
  const insertId = (result as any)[0]?.insertId ?? 0;
  const rows = await db.select().from(notes).where(eq(notes.id, insertId)).limit(1);
  return rows[0];
}

export async function updateNote(id: number, userId: number, data: { content?: string; type?: Note["type"] }) {
  const db = await getDb();
  if (!db) return;
  await db.update(notes).set(data).where(and(eq(notes.id, id), eq(notes.userId, userId)));
}

export async function deleteNote(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
}

// ── Daily Goals ────────────────────────────────────────────────────────────────
export async function getDailyGoal(userId: number, date: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(dailyGoals)
    .where(and(eq(dailyGoals.userId, userId), eq(dailyGoals.date, date)))
    .limit(1);
  return result[0] ?? null;
}

export async function upsertDailyGoal(
  userId: number,
  date: string,
  data: {
    targetWords?: number;
    targetOrders?: number;
    actualWords?: number;
    actualOrders?: number;
    note?: string;
  }
) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(dailyGoals)
    .values({ userId, date, ...data })
    .onDuplicateKeyUpdate({ set: data });
}

// ── AI Plans ───────────────────────────────────────────────────────────────────
export async function getAiPlans(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(aiPlans)
    .where(eq(aiPlans.userId, userId))
    .orderBy(desc(aiPlans.createdAt))
    .limit(limit);
}

export async function getAiPlanById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(aiPlans)
    .where(and(eq(aiPlans.id, id), eq(aiPlans.userId, userId)))
    .limit(1);
  return result[0] ?? null;
}

export async function createAiPlan(data: Omit<typeof aiPlans.$inferInsert, "id">) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(aiPlans).values(data);
  // Return the latest plan for this user
  const rows = await db
    .select()
    .from(aiPlans)
    .where(eq(aiPlans.userId, data.userId))
    .orderBy(desc(aiPlans.createdAt))
    .limit(1);
  return rows[0];
}

// ── Statistics ─────────────────────────────────────────────────────────────────
export async function getStats(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const allOrders = await db.select().from(orders).where(eq(orders.userId, userId));

  let totalSettled = 0,
    totalPending = 0,
    totalDisputed = 0,
    totalWords = 0,
    completedWords = 0;
  const monthlyMap: Record<string, number> = {};
  const csMap: Record<string, { count: number; income: number }> = {};
  const designerMap: Record<string, { count: number; income: number }> = {};
  const statusCounts: Record<string, number> = {};
  const weeklyMap: Record<string, number> = {};

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let thisMonthIncome = 0,
    thisMonthOrders = 0;
  const todayStr = now.toISOString().slice(0, 10);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  for (const o of allOrders) {
    const amt = parseFloat(o.amount ?? "0") || 0;
    const wc = o.wordCount ?? 0;
    totalWords += wc;
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;

    // 使用settleStatus进行统计（三维度状态体系）
    if (o.settleStatus === "已结算" || o.status === "已结算") {
      totalSettled += amt;
      completedWords += wc;
      const mKey = (o.settleDate || o.createdAt?.toISOString() || "").slice(0, 7);
      if (mKey) {
        monthlyMap[mKey] = (monthlyMap[mKey] || 0) + amt;
        if (mKey === thisMonth) {
          thisMonthIncome += amt;
          thisMonthOrders++;
        }
      }
    } else if (o.settleStatus === "待结算" || o.status === "待结算") {
      totalPending += amt;
    } else if (o.settleStatus === "异常核实中") {
      totalDisputed += amt;
    }

    if (o.clientService) {
      if (!csMap[o.clientService]) csMap[o.clientService] = { count: 0, income: 0 };
      csMap[o.clientService].count++;
      if (o.settleStatus === "已结算" || o.status === "已结算") csMap[o.clientService].income += amt;
    }

    if (o.designer) {
      if (!designerMap[o.designer]) designerMap[o.designer] = { count: 0, income: 0 };
      designerMap[o.designer].count++;
      if (o.settleStatus === "已结算" || o.status === "已结算") designerMap[o.designer].income += amt;
    }

    const weekKey = getWeekKey(o.createdAt ?? new Date());
    weeklyMap[weekKey] = (weeklyMap[weekKey] || 0) + 1;
  }

  const overdueOrders = allOrders.filter(
    (o) =>
      o.deadline &&
      o.deadline < todayStr &&
      o.status !== "已完成" &&
      o.status !== "已结算"
  ).length;

  const urgentOrders = allOrders.filter(
    (o) =>
      o.deadline &&
      o.deadline >= todayStr &&
      o.deadline <= in7Days &&
      o.status !== "已完成" &&
      o.status !== "已结算"
  ).length;

  // 统计三维度状态分布
  const settleStatusCounts: Record<string, number> = {};
  const writingStatusCounts: Record<string, number> = {};
  const submissionStatusCounts: Record<string, number> = {};
  for (const o of allOrders) {
    settleStatusCounts[o.settleStatus] = (settleStatusCounts[o.settleStatus] || 0) + 1;
    writingStatusCounts[o.writingStatus] = (writingStatusCounts[o.writingStatus] || 0) + 1;
    submissionStatusCounts[o.submissionStatus] = (submissionStatusCounts[o.submissionStatus] || 0) + 1;
  }

  const disputedOrders = allOrders.filter(o => o.settleStatus === "异常核实中").length;
  const pendingSubmitOrders = allOrders.filter(o => o.submissionStatus === "收货待提交").length;

  return {
    totalOrders: allOrders.length,
    totalSettled: Math.round(totalSettled * 100) / 100,
    totalPending: Math.round(totalPending * 100) / 100,
    totalDisputed: Math.round(totalDisputed * 100) / 100,
    totalWords,
    completedWords,
    thisMonthIncome: Math.round(thisMonthIncome * 100) / 100,
    thisMonthOrders,
    overdueOrders,
    urgentOrders,
    disputedOrders,
    pendingSubmitOrders,
    settleStatusCounts,
    writingStatusCounts,
    submissionStatusCounts,
    monthlyIncome: Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, income]) => ({ month, income: Math.round(income * 100) / 100 })),
    clientServiceRank: Object.entries(csMap)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([name, d]) => ({ name, count: d.count, income: Math.round(d.income * 100) / 100 })),
    designerRank: Object.entries(designerMap)
      .sort(([, a], [, b]) => b.income - a.income)
      .slice(0, 10)
      .map(([name, d]) => ({ name, count: d.count, income: Math.round(d.income * 100) / 100 })),
    statusCounts,
    weeklyOrders: Object.entries(weeklyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([week, count]) => ({ week, count })),
  };
}

function getWeekKey(date: Date): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "1970-01-01";
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + 1);
  return d.toISOString().slice(0, 10);
}

// ── Meta (client services & designers for autocomplete) ───────────────────────
export async function getMeta(userId: number) {
  const db = await getDb();
  if (!db) return { clientServices: [], designers: [], statuses: [] };
  const rows = await db
    .select({ clientService: orders.clientService, designer: orders.designer })
    .from(orders)
    .where(eq(orders.userId, userId));

  const clientServices = Array.from(new Set(rows.map((r) => r.clientService).filter(Boolean) as string[])).sort();
  const designers = Array.from(new Set(rows.map((r) => r.designer).filter(Boolean) as string[])).sort();
  const statuses = ["待开始", "进行中", "待审核", "已完成", "待结算", "已结算"];
  return { clientServices, designers, statuses };
}

// ── Today's Task List ─────────────────────────────────────────────────────────
/**
 * Returns orders that are relevant for today's work:
 * - Status is 待开始, 进行中, or 待审核 (active, not yet done)
 * - OR deadline is today or overdue (urgent)
 * Sorted by deadline ASC (most urgent first), then priority DESC
 */
export async function getTodayTasks(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const todayStr = new Date().toISOString().slice(0, 10);
  const rows = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.userId, userId),
        or(
          inArray(orders.status, ["待开始", "进行中", "待审核"]),
          and(
            like(orders.deadline, `${todayStr}%`)
          )
        )
      )
    )
    .orderBy(asc(orders.deadline), desc(orders.priority))
    .limit(50);
  return rows;
}

/**
 * Returns today's completion summary:
 * - completedToday: orders completed today (completedAt starts with today)
 * - completedIncome: sum of amounts of orders that are 已结算 AND have settleDate = today
 * - pendingSettlement: sum of amounts of orders in 待结算 status
 */
export async function getTodaySummary(userId: number) {
  const db = await getDb();
  if (!db) return { completedToday: 0, completedIncome: 0, pendingSettlement: 0 };
  const todayStr = new Date().toISOString().slice(0, 10);
  const allOrders = await db.select().from(orders).where(eq(orders.userId, userId));
  // completedToday: orders whose completedAt is today
  const completedToday = allOrders.filter(
    (o) => o.completedAt && o.completedAt.startsWith(todayStr)
  );
  // completedIncome: orders that are 已结算 AND settleDate is today
  const settledToday = allOrders.filter(
    (o) => (o.settleStatus === "已结算" || o.status === "已结算") && o.settleDate && o.settleDate.startsWith(todayStr)
  );
  const completedIncome = settledToday.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  const pendingSettlement = allOrders
    .filter((o) => o.settleStatus === "待结算" || o.status === "待结算")
    .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  const disputedSettlement = allOrders
    .filter((o) => o.settleStatus === "异常核实中")
    .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  return {
    completedToday: completedToday.length,
    completedIncome: Math.round(completedIncome * 100) / 100,
    pendingSettlement: Math.round(pendingSettlement * 100) / 100,
    disputedSettlement: Math.round(disputedSettlement * 100) / 100,
  };
}

/**
 * Returns summary data for a date range (for weekly/monthly review).
 */
export async function getRangeSummary(userId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return { completed: 0, income: 0, newOrders: 0, statusBreakdown: {} as Record<string, number> };
  const allOrders = await db.select().from(orders).where(eq(orders.userId, userId));
  // Orders completed in range
  const completedInRange = allOrders.filter(
    (o) => o.completedAt && o.completedAt >= startDate && o.completedAt <= endDate + "T23:59:59"
  );
  // Orders created in range
  const newInRange = allOrders.filter(
    (o) => o.createdAt && o.createdAt >= new Date(startDate) && o.createdAt <= new Date(endDate + "T23:59:59")
  );
  const income = completedInRange.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  const statusBreakdown: Record<string, number> = {};
  allOrders.forEach((o) => {
    statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;
  });
  return {
    completed: completedInRange.length,
    income: Math.round(income * 100) / 100,
    newOrders: newInRange.length,
    statusBreakdown,
    totalActive: allOrders.filter((o) => !["已完成", "已结算"].includes(o.status)).length,
  };
}
