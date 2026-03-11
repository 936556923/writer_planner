# Writer Planner 订单模块升级说明

## 环境要求

| 组件 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | >= 18.x（推荐 22.x） | 运行时环境 |
| MySQL | 5.7+ | 数据库 |
| pnpm | 10.4.1+ | 包管理器（可选，已含 node_modules） |

## 关键依赖版本

| 依赖 | 版本 |
|------|------|
| express | ^4.21.2 |
| mysql2 | ^3.15.0 |
| drizzle-orm | ^0.44.5 |
| react | ^19.2.1 |
| vite | ^7.1.7 |
| typescript | 5.9.3 |
| recharts | ^2.15.2 |
| tailwindcss | ^4.1.14 |

## 升级步骤

### 1. 备份数据库

```bash
mysqldump -u root -p writer_planner > backup_before_upgrade.sql
```

### 2. 执行数据库变更

```bash
mysql -u root -p writer_planner < upgrade_mysql57.sql
```

该 SQL 文件会：
- 扩展 `settleStatus` 枚举，增加 `待结算` 和 `异常核实中`
- 扩展 `writingStatus` 枚举，增加 `待开始`、`进行中`、`修改中`
- 扩展 `submissionStatus` 枚举，增加 `收货待提交`
- 新增 `settleFeedback` 字段（结算异常反馈信息）
- 迁移历史数据到新的三维度状态

### 3. 替换项目文件

将压缩包解压后，替换服务器上的以下目录/文件：
- `dist/` — 编译后的前端和后端代码
- `drizzle/` — 数据库 Schema 定义
- `server/` — 后端源码
- `client/` — 前端源码
- `shared/` — 共享类型和常量

**注意：** 不要覆盖 `.env` 文件，保留您的数据库配置。

### 4. 重启服务

```bash
# 停止当前服务
pm2 stop writer-planner  # 或 kill 对应进程

# 启动新服务
NODE_ENV=production PORT=3456 node dist/index.js
```

## 本次修改内容

### 数据库变更
- `settleStatus`: 新增 `待结算`、`异常核实中` 两个枚举值
- `writingStatus`: 新增 `待开始`、`进行中`、`修改中` 三个枚举值
- `submissionStatus`: 新增 `收货待提交` 一个枚举值
- 新增 `settleFeedback` VARCHAR(256) 字段

### 后端修改
- `drizzle/schema.ts`: 更新 orders 表 Schema 定义
- `server/routers/orders.ts`: 支持三维度状态筛选、编辑、批量结算
- `server/db.ts`: getOrders 多维度筛选、getStats 三维度统计
- `server/fileRoutes.ts`: Excel 导入智能推导三维度状态、导出增加新字段

### 前端修改
- `client/src/lib/utils.ts`: 三维度状态配置和颜色
- `client/src/components/StatusBadge.tsx`: 新增三种状态徽章组件
- `client/src/pages/Orders.tsx`: 三维度筛选器、表格展示、编辑弹窗
- `client/src/pages/Home.tsx`: 首页异常提醒、三维度状态分布
- `client/src/pages/Stats.tsx`: 三维度饼图、异常金额统计

### 订单状态体系说明

| 维度 | 字段 | 可选值 | 说明 |
|------|------|--------|------|
| 写作状态 | writingStatus | 待开始、进行中、修改中、已完成 | 业务执行进度 |
| 提交状态 | submissionStatus | 未提交、收货待提交、待提交、已提交 | 交付流转状态 |
| 结算状态 | settleStatus | 未结算、待结算、异常核实中、已结算 | 财务结算状态 |
| 结算反馈 | settleFeedback | 自由文本 | 异常时的反馈信息 |

### Excel 导入状态自动推导规则

| 处理结果关键词 | 写作状态 | 提交状态 | 结算状态 |
|---------------|---------|---------|---------|
| 含"结算完成"/"已结算" | 已完成 | 已提交 | 已结算 |
| "已收货" | 已完成 | 收货待提交 | 未结算 |
| 含"未备注"/"找客服处理"/"异常"/"驳回" | 已完成 | 已提交 | 异常核实中 |
| 含"已完成"/"完成" | 已完成 | 已提交 | 待结算 |
| 含"审核" | 已完成 | 待提交 | 未结算 |
| 空（无处理结果） | 进行中 | 未提交 | 未结算 |
