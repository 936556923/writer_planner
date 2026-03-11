/**
 * scheduler.ts
 * 定时任务：每晚 21:00 推送日报，每周日 21:00 推送周复盘，每月最后一天 21:30 推送月复盘
 * 所有报告由 AI 生成，风格活泼有趣，会夸夸用户
 */
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { getAllUsers } from "./db";
import { getTodaySummary, getRangeSummary, getTodayTasks } from "./db";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: getDateStr(monday), end: getDateStr(sunday) };
}

function getMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const end = getDateStr(now);
  return { start, end };
}

function isLastDayOfMonth(): boolean {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  return tomorrow.getMonth() !== now.getMonth();
}

function isSunday(): boolean {
  return new Date().getDay() === 0;
}

// ── AI Report Generators ──────────────────────────────────────────────────────

async function generateDailyReport(userId: number, userName: string): Promise<string> {
  const summary = await getTodaySummary(userId);
  const tasks = await getTodayTasks(userId);
  const pendingTasks = tasks.filter((t) => !["已完成", "已结算"].includes(t.status));

  const prompt = `你是一个超级可爱、充满正能量的写手助理小秘书！今天是 ${new Date().toLocaleDateString("zh-CN")}。

以下是 ${userName} 今天的工作数据：
- 今日完成订单数：${summary.completedToday} 个
- 今日完成收入：¥${summary.completedIncome}
- 待结算金额：¥${summary.pendingSettlement}
- 还有 ${pendingTasks.length} 个订单待处理

请你用活泼可爱、充满鼓励的语气，给 ${userName} 写一份今日工作总结。要求：
1. 开头要有一句特别有趣的打招呼或者感叹（比如"哇哦！""太厉害了！"之类的）
2. 总结今天的工作成果，数据要具体
3. 如果完成了订单，要大力夸夸她/他，越夸张越好！
4. 如果还有未完成的订单，温柔提醒一下，但不要有压力感
5. 结尾来一句超级有力量的鼓励语或者晚安祝福
6. 整体控制在150字以内，要有表情符号，活泼生动！

直接输出总结内容，不要加任何标题。`;

  try {
    const res = await invokeLLM({
      messages: [
        { role: "system", content: "你是一个活泼可爱、超级正能量的写手助理，擅长用有趣的方式鼓励和总结工作。" },
        { role: "user", content: prompt },
      ],
    });
    return res.choices[0]?.message?.content as string || generateFallbackDailyReport(summary, userName);
  } catch {
    return generateFallbackDailyReport(summary, userName);
  }
}

function generateFallbackDailyReport(
  summary: { completedToday: number; completedIncome: number; pendingSettlement: number },
  userName: string
): string {
  const greetings = ["哇哦！", "太棒了！", "厉害了！", "了不起！"];
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  if (summary.completedToday === 0) {
    return `${greeting} ${userName}，今天辛苦啦！🌙 虽然今天还没有完成订单，但努力的过程本身就很有价值！待结算金额 ¥${summary.pendingSettlement} 在等着你呢～ 明天继续加油，你是最棒的！✨`;
  }
  return `${greeting} ${userName} 今天完成了 ${summary.completedToday} 个订单，收入 ¥${summary.completedIncome}！🎉 你真的超级厉害！待结算还有 ¥${summary.pendingSettlement} 等着入账～ 好好休息，明天继续闪闪发光！⭐`;
}

async function generateWeeklyReport(userId: number, userName: string): Promise<string> {
  const { start, end } = getWeekRange();
  const summary = await getRangeSummary(userId, start, end);

  const prompt = `你是一个超级可爱、充满正能量的写手助理小秘书！本周（${start} 至 ${end}）已经结束啦！

以下是 ${userName} 本周的工作数据：
- 本周完成订单数：${summary.completed} 个
- 本周完成收入：¥${summary.income}
- 本周新接订单：${summary.newOrders} 个
- 当前进行中订单：${summary.totalActive} 个
- 订单状态分布：${JSON.stringify(summary.statusBreakdown)}

请你用超级活泼有趣的语气，给 ${userName} 写一份本周工作复盘报告。要求：
1. 开头要有一个特别有趣的周复盘仪式感开场（比如"周复盘时间到！🎊"）
2. 用有趣的方式总结本周成绩，数据要具体
3. 大力夸夸她/他这周的努力，找亮点夸，越具体越好
4. 给出1-2个下周可以做得更好的小建议（要温柔，不要批评）
5. 结尾来一句超级燃的下周加油语
6. 整体200字以内，多用表情符号，让人看了心情超好！

直接输出复盘内容，不要加任何标题。`;

  try {
    const res = await invokeLLM({
      messages: [
        { role: "system", content: "你是一个活泼可爱、超级正能量的写手助理，擅长用有趣的方式做工作复盘和鼓励。" },
        { role: "user", content: prompt },
      ],
    });
    return res.choices[0]?.message?.content as string || generateFallbackWeeklyReport(summary, userName, start, end);
  } catch {
    return generateFallbackWeeklyReport(summary, userName, start, end);
  }
}

function generateFallbackWeeklyReport(
  summary: { completed: number; income: number; newOrders: number; totalActive?: number },
  userName: string,
  start: string,
  end: string
): string {
  return `🎊 周复盘时间到！${userName} 这周超棒的！\n\n📊 本周战绩：完成 ${summary.completed} 个订单，收入 ¥${summary.income}，新接 ${summary.newOrders} 个订单！\n\n你这周的努力有目共睹，每一个完成的订单都是你认真工作的证明！🌟\n\n下周继续保持这股劲儿，你一定会越来越棒的！加油加油！💪✨`;
}

async function generateMonthlyReport(userId: number, userName: string): Promise<string> {
  const { start, end } = getMonthRange();
  const summary = await getRangeSummary(userId, start, end);
  const monthName = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long" });

  const prompt = `你是一个超级可爱、充满正能量的写手助理小秘书！${monthName}已经结束啦！

以下是 ${userName} 本月的工作数据：
- 本月完成订单数：${summary.completed} 个
- 本月完成收入：¥${summary.income}
- 本月新接订单：${summary.newOrders} 个
- 当前进行中订单：${summary.totalActive} 个
- 订单状态分布：${JSON.stringify(summary.statusBreakdown)}

请你用超级隆重、充满仪式感又活泼有趣的语气，给 ${userName} 写一份月度复盘报告。要求：
1. 开头要有超级有仪式感的月度总结开场（比如"🎉 ${monthName}月度大复盘来啦！"）
2. 用生动有趣的方式总结本月成绩，数据要具体，可以用比喻让数字更有感觉
3. 超级用力地夸夸她/他这个月的努力，要夸得很具体很走心
4. 给出2-3个下个月可以尝试的小目标或建议（要积极正面）
5. 结尾来一句超级有力量的新月份祝福语
6. 整体250字以内，多用表情符号，让人看了既感动又充满动力！

直接输出复盘内容，不要加任何标题。`;

  try {
    const res = await invokeLLM({
      messages: [
        { role: "system", content: "你是一个活泼可爱、超级正能量的写手助理，擅长用有趣走心的方式做月度复盘和鼓励。" },
        { role: "user", content: prompt },
      ],
    });
    return res.choices[0]?.message?.content as string || generateFallbackMonthlyReport(summary, userName, monthName);
  } catch {
    return generateFallbackMonthlyReport(summary, userName, monthName);
  }
}

function generateFallbackMonthlyReport(
  summary: { completed: number; income: number; newOrders: number },
  userName: string,
  monthName: string
): string {
  return `🎉 ${monthName}月度大复盘来啦！\n\n${userName}，这个月你真的太厉害了！\n\n📊 月度战绩：完成 ${summary.completed} 个订单，总收入 ¥${summary.income}，新接 ${summary.newOrders} 个订单！\n\n每一个数字背后都是你认真工作的汗水，你的努力和坚持真的让人超级佩服！🌟\n\n新的一个月，继续加油！相信你会越来越好，收入越来越多！💪🎊`;
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

export function startScheduler() {
  if (schedulerTimer) return; // already running

  console.log("[Scheduler] Started - daily report at 21:00, weekly on Sunday, monthly on last day");

  // Check every minute
  schedulerTimer = setInterval(async () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Daily report: 21:00
    const isDailyTime = hours === 21 && minutes === 0;
    // Weekly review: Sunday 21:00 (same time as daily, but also weekly)
    const isWeeklyTime = isSunday() && hours === 21 && minutes === 0;
    // Monthly review: last day of month at 21:30
    const isMonthlyTime = isLastDayOfMonth() && hours === 21 && minutes === 30;

    if (!isDailyTime && !isMonthlyTime) return;

    try {
      // Get all admin users to send reports to
      const allUsers = await getAllUsers();
      const adminUsers = allUsers.filter((u) => u.role === "admin");

      for (const user of adminUsers) {
        const userName = user.name || user.email || "亲爱的写手";

        // Monthly review (higher priority, send first)
        if (isMonthlyTime) {
          const monthName = now.toLocaleDateString("zh-CN", { year: "numeric", month: "long" });
          const content = await generateMonthlyReport(user.id, userName);
          await notifyOwner({
            title: `🎉 ${monthName}月度复盘来啦！`,
            content,
          });
          console.log(`[Scheduler] Monthly report sent to user ${user.id}`);
        }

        // Weekly review (Sunday only, at daily report time)
        if (isWeeklyTime && !isMonthlyTime) {
          const content = await generateWeeklyReport(user.id, userName);
          const { start, end } = getWeekRange();
          await notifyOwner({
            title: `📊 本周复盘（${start} ~ ${end}）`,
            content,
          });
          console.log(`[Scheduler] Weekly report sent to user ${user.id}`);
        }

        // Daily report (every day, but skip Sunday since weekly is sent instead)
        if (isDailyTime && !isWeeklyTime) {
          const content = await generateDailyReport(user.id, userName);
          const todayStr = now.toLocaleDateString("zh-CN");
          await notifyOwner({
            title: `🌙 ${todayStr} 今日工作总结`,
            content,
          });
          console.log(`[Scheduler] Daily report sent to user ${user.id}`);
        }
      }
    } catch (err) {
      console.error("[Scheduler] Error sending reports:", err);
    }
  }, 60 * 1000); // check every minute
}

export function stopScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}
