import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  boolean,
  index,
} from "drizzle-orm/mysql-core";

// ── Users ──────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  // admin = 管理员（法师大人，完整管理权限，原 owner+admin 合并）
  // assistant = 可被授权的助理
  // user = 普通用户/居民（原 resident+user 合并）
  role: mysqlEnum("role", ["user", "admin", "assistant"]).default("user").notNull(),
  // Independent auth fields (username + password login)
  username: varchar("username", { length: 64 }).unique(),
  passwordHash: varchar("passwordHash", { length: 256 }),
  displayName: varchar("displayName", { length: 64 }),
  coins: int("coins").default(0).notNull(), // magic coins balance
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── Assistant Authorizations ───────────────────────────────────────────────────
// An admin can authorize an assistant to view/edit their data
export const assistantAuthorizations = mysqlTable(
  "assistant_authorizations",
  {
    id: int("id").autoincrement().primaryKey(),
    adminId: int("adminId").notNull(), // the admin who grants access
    assistantId: int("assistantId").notNull(), // the assistant who receives access
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [index("idx_auth_admin").on(t.adminId), index("idx_auth_assistant").on(t.assistantId)]
);

export type AssistantAuthorization = typeof assistantAuthorizations.$inferSelect;

// ── User Config ────────────────────────────────────────────────────────────────
export const userConfigs = mysqlTable("user_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  deepseekKey: text("deepseekKey"),
  aiModel: varchar("aiModel", { length: 64 }).default("deepseek-chat"),
  wordsPerHour: int("wordsPerHour").default(1500),
  workHoursPerDay: int("workHoursPerDay").default(8),
  defaultStatus: varchar("defaultStatus", { length: 32 }).default("待开始"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserConfig = typeof userConfigs.$inferSelect;

// ── Orders ─────────────────────────────────────────────────────────────────────
export const orders = mysqlTable(
  "orders",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(), // owner of this order
    orderId: varchar("orderId", { length: 128 }).default(""),
    orderNo: varchar("orderNo", { length: 128 }).default(""),
    clientService: varchar("clientService", { length: 128 }).default(""),
    designer: varchar("designer", { length: 128 }).default(""),
    amount: varchar("amount", { length: 64 }).default(""),
    settleDate: varchar("settleDate", { length: 32 }).default(""),
    deadline: varchar("deadline", { length: 32 }).default(""),
    title: text("title"),
    wordCount: int("wordCount").default(0),
    // 旧的统一状态字段（为backward compatibility）
    status: mysqlEnum("status", [
      "待开始",
      "进行中",
      "待审核",
      "已完成",
      "待结算",
      "已结算",
    ])
      .default("待开始")
      .notNull(),
    // 订单金额状态：已结算/未结算/待结算/异常核实中
    settleStatus: mysqlEnum("settleStatus", ["已结算", "未结算", "待结算", "异常核实中"])
      .default("未结算")
      .notNull(),
    // 结算反馈（记录驳回原因等异常信息）
    settleFeedback: varchar("settleFeedback", { length: 256 }).default(""),
    // 写作状态：待开始/进行中/修改中/已完成
    writingStatus: mysqlEnum("writingStatus", ["初稿待提交", "修改", "已完成", "待开始", "进行中", "修改中"])
      .default("待开始")
      .notNull(),
    // 提交状态：已提交/未提交/待提交/收货待提交
    submissionStatus: mysqlEnum("submissionStatus", ["已提交", "未提交", "待提交", "收货待提交"])
      .default("未提交")
      .notNull(),
    progressStatus: varchar("progressStatus", { length: 32 }).default(""),
    priority: int("priority").default(0),
    tags: varchar("tags", { length: 256 }).default(""),
    estimatedHours: float("estimatedHours").default(0),
    actualHours: float("actualHours").default(0),
    completedAt: varchar("completedAt", { length: 64 }).default(""),
    // Assistant who helped with this order (nullable)
    assistantId: int("assistantId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("idx_orders_user").on(t.userId),
    index("idx_orders_assistant").on(t.assistantId),
    index("idx_orders_settle").on(t.settleStatus),
    index("idx_orders_writing").on(t.writingStatus),
    index("idx_orders_submission").on(t.submissionStatus),
    index("idx_orders_deadline").on(t.deadline),
  ]
);

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ── Notes ──────────────────────────────────────────────────────────────────────
export const notes = mysqlTable(
  "notes",
  {
    id: int("id").autoincrement().primaryKey(),
    orderId: int("orderId").notNull(),
    userId: int("userId").notNull(),
    content: text("content").notNull(),
    type: mysqlEnum("type", ["normal", "important"]).default("normal").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [index("idx_notes_order").on(t.orderId)]
);

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

// ── Daily Goals ────────────────────────────────────────────────────────────────
export const dailyGoals = mysqlTable(
  "daily_goals",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    date: varchar("date", { length: 16 }).notNull(), // YYYY-MM-DD
    targetWords: int("targetWords").default(0),
    targetOrders: int("targetOrders").default(0),
    actualWords: int("actualWords").default(0),
    actualOrders: int("actualOrders").default(0),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [index("idx_goals_user_date").on(t.userId, t.date)]
);

export type DailyGoal = typeof dailyGoals.$inferSelect;

// ── AI Plans ───────────────────────────────────────────────────────────────────
export const aiPlans = mysqlTable(
  "ai_plans",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    content: text("content").notNull(),
    mode: varchar("mode", { length: 32 }).default("daily"),
    orderCount: int("orderCount").default(0),
    totalWords: int("totalWords").default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [index("idx_aiplans_user").on(t.userId)]
);

export type AiPlan = typeof aiPlans.$inferSelect;

// ── Owner Status ───────────────────────────────────────────────────────────────
// The owner's current activity status shown in the interactive plaza
export const ownerStatus = mysqlTable("owner_status", {
  id: int("id").autoincrement().primaryKey(),
  status: mysqlEnum("status", ["working", "eating", "playing_dog", "slacking", "dungeon", "sleeping"]).default("working").notNull(),
  customMessage: varchar("customMessage", { length: 200 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OwnerStatus = typeof ownerStatus.$inferSelect;

// ── Danmaku (Bullet Comments) ──────────────────────────────────────────────────
// Real-time floating comments visible to all users
export const danmaku = mysqlTable("danmaku", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  content: varchar("content", { length: 100 }).notNull(),
  color: varchar("color", { length: 20 }).default("#ffffff"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [index("idx_danmaku_user").on(t.userId), index("idx_danmaku_time").on(t.createdAt)]);

export type Danmaku = typeof danmaku.$inferSelect;

// ── Kingdom Announcements ──────────────────────────────────────────────────────
// Announcements published by the owner, visible to all residents
export const announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 100 }).notNull(),
  content: text("content").notNull(),
  isPinned: boolean("isPinned").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [index("idx_ann_pinned").on(t.isPinned)]);

export type Announcement = typeof announcements.$inferSelect;

// ── Gift / Feed Records ────────────────────────────────────────────────────────
// Residents can spend coins to send gifts to the owner
export const giftRecords = mysqlTable("gift_records", {
  id: int("id").autoincrement().primaryKey(),
  senderId: int("senderId").notNull(),
  giftType: mysqlEnum("giftType", ["flower", "cake", "drumstick", "crystal", "magic_wand", "crown"]).notNull(),
  coinsCost: int("coinsCost").notNull(),
  message: varchar("message", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [index("idx_gift_sender").on(t.senderId)]);

export type GiftRecord = typeof giftRecords.$inferSelect;

// ── Coin Grant Records ─────────────────────────────────────────────────────────
// Owner grants coins to users; full audit trail
export const coinGrants = mysqlTable("coin_grants", {
  id: int("id").autoincrement().primaryKey(),
  grantedBy: int("grantedBy").notNull(), // owner user id
  recipientId: int("recipientId").notNull(),
  amount: int("amount").notNull(),
  note: varchar("note", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [index("idx_grant_recipient").on(t.recipientId)]);

export type CoinGrant = typeof coinGrants.$inferSelect;

// ── Payment QR Code ────────────────────────────────────────────────────────────
// Owner's payment QR code for tipping
export const paymentQR = mysqlTable("payment_qr", {
  id: int("id").autoincrement().primaryKey(),
  platform: mysqlEnum("platform", ["wechat", "alipay"]).notNull(),
  imageUrl: varchar("imageUrl", { length: 500 }).notNull(),
  thankMessage: varchar("thankMessage", { length: 300 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaymentQR = typeof paymentQR.$inferSelect;

// ── Character Profiles (RPG) ───────────────────────────────────────────────────
// Each user's RPG character - profession, appearance, nickname, level
export const characterProfiles = mysqlTable("character_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  nickname: varchar("nickname", { length: 32 }), // in-game ID/nickname
  // Combat profession (locked after selection, owner is always 法师大人)
  combatClass: mysqlEnum("combatClass", [
    "mage",        // 法师
    "warrior",     // 战士
    "rogue",       // 刺客
    "archer",      // 弓手
    "paladin",     // 圣骑士
    "necromancer", // 死灵法师
    "owner",       // 法师大人（小炮专属）
  ]),
  // Life profession (can be changed)
  lifeClass: mysqlEnum("lifeClass", [
    "blacksmith",  // 铁匠
    "merchant",    // 商人
    "chef",        // 厨师
    "farmer",      // 农夫
    "scholar",     // 学者
    "bard",        // 吟游诗人
    "alchemist",   // 炼金术士
    "beggar",      // 乞丐
  ]),
  // Avatar appearance (JSON: hair, outfit, accessory, color scheme)
  avatarConfig: text("avatarConfig"), // JSON string
  // RPG stats
  level: int("level").default(1).notNull(),
  exp: int("exp").default(0).notNull(),
  // Current tavern action (shown in tavern when online)
  tavernAction: mysqlEnum("tavernAction", [
    "drinking",    // 喝酒
    "playing_lute",// 弹琴
    "chatting",    // 聊天
    "sleeping",    // 打盹
    "arm_wrestling",// 掰手腕
    "reading",     // 看书
  ]).default("drinking"),
  profileSetupDone: boolean("profileSetupDone").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [index("idx_char_user").on(t.userId)]);

export type CharacterProfile = typeof characterProfiles.$inferSelect;

// ── Daily Quests (RPG) ────────────────────────────────────────────────────────
// AI-generated daily quest/story for each user, refreshed daily
export const dailyQuests = mysqlTable("daily_quests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  // The main story text (AI generated)
  storyText: text("storyText").notNull(),
  // Current stage: intro / choice / outcome / completed
  stage: mysqlEnum("stage", ["intro", "choice", "outcome", "completed"]).default("intro").notNull(),
  // JSON array of choices: [{id, text, effect}]
  choices: text("choices"),
  // Which choice was selected
  selectedChoice: varchar("selectedChoice", { length: 8 }),
  // Outcome text after choice
  outcomeText: text("outcomeText"),
  // Rewards
  expReward: int("expReward").default(0),
  coinReward: int("coinReward").default(0),
  rewardClaimed: boolean("rewardClaimed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [
  index("idx_quest_user_date").on(t.userId, t.date),
]);

export type DailyQuest = typeof dailyQuests.$inferSelect;

// ── Quest Story Arc (long-running storyline) ──────────────────────────────────
// Tracks the overall narrative arc for each character across multiple days
export const storyArcs = mysqlTable("story_arcs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  arcTitle: varchar("arcTitle", { length: 100 }),
  // JSON array of key story events/choices made
  historyLog: text("historyLog"), // JSON: [{date, summary, choice}]
  currentChapter: int("currentChapter").default(1).notNull(),
  totalDaysPlayed: int("totalDaysPlayed").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [index("idx_arc_user").on(t.userId)]);

export type StoryArc = typeof storyArcs.$inferSelect;

// ── Calendar Events (AI-managed personal schedule) ───────────────────────────
export const calendarEvents = mysqlTable("calendar_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 128 }).notNull(),
  eventType: mysqlEnum("eventType", ["work", "fitness", "skincare", "meal", "rest", "social", "other"]).default("other").notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(), // HH:MM
  endTime: varchar("endTime", { length: 5 }).default(""),   // HH:MM
  date: varchar("date", { length: 16 }).notNull(),           // YYYY-MM-DD
  isRecurring: boolean("isRecurring").default(false).notNull(),
  cronRule: varchar("cronRule", { length: 128 }).default(""), // e.g. "mon,wed,fri" or "daily"
  isCompleted: boolean("isCompleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [index("idx_cal_user_date").on(t.userId, t.date)]);

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;

// ── Todos (4-Quadrant task management) ───────────────────────────────────────
export const todos = mysqlTable("todos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  quadrant: mysqlEnum("quadrant", [
    "important_urgent",
    "important_not_urgent",
    "urgent_not_important",
    "neither",
  ]).default("neither").notNull(),
  aiClassified: boolean("aiClassified").default(false).notNull(),
  deadline: varchar("deadline", { length: 32 }).default(""),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  completedAt: varchar("completedAt", { length: 64 }).default(""),
  // Gamification: reward given on completion
  coinReward: int("coinReward").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [index("idx_todo_user").on(t.userId), index("idx_todo_quadrant").on(t.quadrant)]);

export type Todo = typeof todos.$inferSelect;
export type InsertTodo = typeof todos.$inferInsert;

// ── Game Items (equipment, pet eggs, consumables) ────────────────────────────
export const items = mysqlTable("items", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  type: mysqlEnum("type", ["equipment", "pet_egg", "consumable", "cosmetic"]).notNull(),
  rarity: mysqlEnum("rarity", ["common", "rare", "epic", "legendary"]).default("common").notNull(),
  description: text("description"),
  iconEmoji: varchar("iconEmoji", { length: 16 }).default("📦"),
  dropRate: float("dropRate").default(0.1), // base drop probability 0-1
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Item = typeof items.$inferSelect;
export type InsertItem = typeof items.$inferInsert;

// ── User Inventory (items owned by users) ────────────────────────────────────
export const userInventory = mysqlTable("user_inventory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  itemId: int("itemId").notNull(),
  quantity: int("quantity").default(1).notNull(),
  isEquipped: boolean("isEquipped").default(false).notNull(),
  obtainedAt: timestamp("obtainedAt").defaultNow().notNull(),
}, (t) => [index("idx_inv_user").on(t.userId), index("idx_inv_item").on(t.itemId)]);

export type UserInventoryEntry = typeof userInventory.$inferSelect;

// ── AI Compliment Templates (expandable praise library) ──────────────────────
export const aiCompliments = mysqlTable("ai_compliments", {
  id: int("id").autoincrement().primaryKey(),
  template: varchar("template", { length: 300 }).notNull(),
  category: mysqlEnum("category", ["order_complete", "streak", "level_up", "daily_login", "general"]).default("general").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiCompliment = typeof aiCompliments.$inferSelect;
