# Writer Planner (金羽体育测试服务器)

Writer Planner 是一款专为工作室/代写/设计团队量身打造的**跨端订单全生命周期管理系统**，内置强大的数据图表、人员打卡管理、自动排班、AI分析、以及财务对账模块，具有现代化的操作体验及细分权限管理（业主、助理、普通用户/居民）。

---

## 🛠 技术栈
- **前端 (Frontend)**: React 19, Vite, TailwindCSS (v4), Radix UI 组件库, Wouter (路由)
- **后端 (Backend)**: Node.js (Express), TRPC, Drizzle ORM
- **数据库 (Database)**: MySQL 5.7+
- **构建工具**: Vite + ESBuild, pnpm

---

## 🚀 快速启动与部署

### 第一步：环境要求
项目运行基于服务端 Node 环境及 MySQL：
- Node.js 20+
- MySQL 5.7 或以上版本
- pnpm (推荐 `npm i -g pnpm`)

### 第二步：数据库初始化
在启动前，你需要预先创建好对应的数据表结构。
在 MySQL 终端中或使用 Navicat 执行项目根目录下的 SQL 脚本：

```bash
# 导入初始数据表及最新结构
mysql -u root -p < writer_planner.sql
# 或者导入升级用 SQL（仅覆盖写定 Enum ）
mysql -u root -p writer_planner < upgrade_mysql57.sql
```

> **注意：** 系统通过 `drizzle-orm` 进行查询和部分数据校验，请确保数据库内诸如 `writingStatus` 等 Enum 配置字眼与 `drizzle/schema.ts` 以及上面 SQL 一一对应，否则部分订单导入将会抛出 500 错误。

### 第三步：配置环境变量 `.env`
复制一份环境变量到项目根目录（直接创建 `.env` 文件），并确保参数满足你的服务器或本地跑环境：

```env
# 核心数据库连接串 (mysql://用户名:密码@地址:端口/库名)
DATABASE_URL=mysql://root:824310St!@localhost:3306/writer_planner
# 本地 Node 启动端口 (在 PM2 或 Nginx 配置中应当转发至此)
PORT=3000

# 安全类 Cookie 加密盐及 JWT 验签（发到线上修改为复杂随机字符串）
COOKIE_SECRET=writer-planner-secret-key-2024-local-dev
JWT_SECRET=writer-planner-secret-key-2024-local-dev
VITE_APP_ID=writer-planner-local

# AI/三方拓展相关
BUILT_IN_FORGE_API_URL=https://api.openai.com/v1
BUILT_IN_FORGE_API_KEY=sk-127596863eb4487b8f195c1c08463e69

# 其他开关（例如本地开发免除部分三方验证）
CAPTCHA_BYPASS=LOCAL_BYPASS
```

### 第四步：安装依赖 & 启动模块

#### 本地开发
```bash
# 1. 安装核心依赖
pnpm install

# 2. 启动开发模式 (监听文件变化，实时热更前端及后端)
pnpm run dev
```

#### 服务器生产部署
生产环境请注意使用 `pnpm build` 进行打包，随后结合 PM2 进行守护进程管理。

```bash
# 1. 生产环境安装依赖
pnpm install

# 2. 打包出纯净的前端资源和预编译服务端 index.js
pnpm run build

# 3. (可选) 推送 Drizzle 结构到数据库 (如使用独立迁移)
pnpm run db:push

# 4. 使用 PM2 挂载启动服务 (或者执行 pnpm run start)
pm2 start ecosystem.config.js
```
*备注：生产服务器需要配置 Nginx 反向代理将请求转发到 Node 开放的 `3000` 端口上。*

---

## 📦 重点功能说明

### Excel 导入与导出
系统中提供了对代写订单的高级数据上传下发支持，可直接在【数据管理】页面完成：
- **精准映射：** 核心适配了财务实际记录本规范。导入导出时严密遵循如 `日期（最终提交结算时间）`、`接单设计师 (花名）` 等定制化表头。（详见 `server/fileRoutes.ts`）
- **错误拦截与提示：** 系统自动处理由国内部分平台导出的伪装 HTML 格式 `.xlsx` 并拒绝入库。同时具备 Enum 合法入库校验。

### API & SSR 开发规范
- `client/` : 所有位于该目录下的均属于前端渲染业务，涉及各类 React Components。
- `server/` : 存放所有的 Express 路由、鉴权策略 `sdk.ts` 及 `fileRoutes.ts` 导入解析核心。请不要在此执行只属前端域的逻辑。
- `shared/` : 放置跨端共享的 Typescript Interface 及 Drizzle 数据字典验证（Schema）。

### 开发者文档
修改和拓展 Enum 值后，需要：
1. 更新 `drizzle/schema.ts` 里的允许值。
2. 同步生成对应 `upgrade_mysql57.sql` 或直接在线改动数据库表的 Enum Constraint。
3. `pnpm run build` 重启环境即可生效。

---
*© 2026 Writer Planner Team. All Rights Reserved.*
