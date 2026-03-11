# Writer Planner App V2 - 游戏化系统升级指南

## 升级概述

本次升级为系统新增了以下核心功能模块：

| 模块 | 功能描述 | 涉及角色 |
| :--- | :--- | :--- |
| **三维度金额速览** | 仪表盘展示今日/本周/本月金额 | 小炮大王(admin) |
| **AI 夸夸弹幕** | 30+ 条滚动夸奖语，双行交替显示 | 小炮大王(admin) |
| **AI 日历行程** | 自然语言输入，AI 自动填充日历 | 所有用户 |
| **四象限任务管理** | 粘贴文字，AI 自动分类到四象限 | 所有用户 |
| **随机掉落系统** | 完成任务随机获得装备/宠物蛋 | 所有用户 |
| **我的背包** | 查看和管理获得的物品 | 所有用户 |
| **助理协作视图** | 展示共同完成的订单和协作数据 | 助理(assistant) |

---

## 升级步骤

### 1. 备份数据库

```bash
mysqldump -u root -p your_database > backup_before_v2.sql
```

### 2. 执行数据库迁移

```bash
mysql -u root -p your_database < drizzle/upgrade_v2_gamification.sql
```

该脚本会：
- 创建 `calendar_events` 表（日历事件）
- 创建 `todos` 表（四象限待办）
- 创建 `items` 表（物品定义）+ 插入 16 个默认物品
- 创建 `user_inventory` 表（用户背包）
- 为 `orders` 表添加 `assistant_id` 字段

### 3. 替换代码文件

以下是本次升级涉及的所有文件：

**数据库层（Schema）：**
- `drizzle/schema.ts` — 新增 4 张表定义 + orders 表新增 assistantId 字段

**后端路由（新增）：**
- `server/routers/calendar.ts` — 日历 CRUD + AI 解析
- `server/routers/todoQuadrant.ts` — 四象限 CRUD + AI 分类
- `server/routers/drops.ts` — 掉落系统 + 背包 + 本周收入

**后端路由（修改）：**
- `server/routers.ts` — 注册新路由

**前端页面（新增）：**
- `client/src/pages/MyCalendar.tsx` — AI 日历行程页面
- `client/src/pages/TodoQuadrant.tsx` — 四象限任务管理页面
- `client/src/pages/Inventory.tsx` — 我的背包页面
- `client/src/pages/AssistantDashboard.tsx` — 助理协作中心页面

**前端页面（修改）：**
- `client/src/pages/Home.tsx` — 仪表盘升级（三维度金额 + AI 夸夸弹幕 + 布局优化）

**前端组件（修改）：**
- `client/src/components/DashboardLayout.tsx` — 导航菜单新增入口

**路由配置（修改）：**
- `client/src/App.tsx` — 注册新页面路由

### 4. 安装依赖并重新构建

```bash
cd writer-planner-app
pnpm install
pnpm build
```

### 5. 重启服务

```bash
pm2 restart writer-planner-app
# 或者
systemctl restart writer-planner
```

---

## 新增文件清单

```
drizzle/
  upgrade_v2_gamification.sql    # SQL 迁移脚本

server/routers/
  calendar.ts                    # 日历路由
  todoQuadrant.ts                # 四象限路由
  drops.ts                       # 掉落系统路由

client/src/pages/
  MyCalendar.tsx                 # 日历页面
  TodoQuadrant.tsx               # 四象限页面
  Inventory.tsx                  # 背包页面
  AssistantDashboard.tsx         # 助理面板
```

## 修改文件清单

```
drizzle/schema.ts                # +4 表定义, orders 表 +1 字段
server/routers.ts                # +3 路由注册
client/src/App.tsx               # +4 页面路由
client/src/pages/Home.tsx        # 仪表盘全面升级
client/src/components/DashboardLayout.tsx  # +4 导航菜单项
```

---

## 功能详细说明

### AI 日历行程
- 用户输入自然语言描述（如"每天早上8点吃早餐，周一三五下午3点健身"）
- AI 自动解析并创建对应的日历事件
- 支持 7 种事件类型：工作、健身、护肤、用餐、休息、社交、其他
- 周视图展示，支持手动添加和删除

### 四象限任务管理
- 粘贴任意文字，AI 自动提取任务并分类到四象限
- 四象限：重要且紧急、重要不紧急、紧急不重要、不重要不紧急
- 完成任务获得金币奖励
- 有概率触发随机掉落（装备/宠物蛋）

### 随机掉落系统
- 完成任务时有概率获得物品掉落
- 物品分为 4 个稀有度：普通(30%)、稀有(10%)、史诗(5%)、传说(1%)
- 物品类型：装备、宠物蛋、消耗品
- 预置 16 个默认物品，可在 items 表中自由扩展

### 助理协作视图
- 展示助理与管理员共同完成的订单数量和金额
- 独立的正向激励弹幕
- 协作数据统计面板

---

## 注意事项

1. **AI 功能依赖 OpenAI API**：确保 `.env` 中配置了有效的 `OPENAI_API_KEY`
2. **物品扩展**：可直接在 `items` 表中 INSERT 新物品，系统会自动识别
3. **助理关联**：需要在创建/编辑订单时手动指定 `assistant_id`，后续可在订单管理界面中添加此功能
4. **数据库兼容**：SQL 脚本兼容 MySQL 5.7+ 和 MySQL 8.0+
