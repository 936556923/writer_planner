import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { StatusBadge, WritingStatusBadge, SubmissionStatusBadge, SettleStatusBadge } from "@/components/StatusBadge";
import { PixelAvatarDisplay, DEFAULT_AVATAR } from "@/components/PixelAvatar";
import type { AvatarConfig } from "@/components/PixelAvatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { formatAmount, formatRelativeDate, today, daysUntil, ORDER_STATUSES, WRITING_STATUSES, SUBMISSION_STATUSES, SETTLE_STATUSES } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Circle,
  Clock,
  DollarSign,
  FileText,
  Flame,
  Package,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Zap,
  Crown,
  Swords,
  Shield,
  CalendarDays,
  Gift,
  Heart,
} from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";
import { Streamdown } from "streamdown";

// ── Extended AI compliment pool (30+ messages for rich scrolling) ────────────
const AI_COMPLIMENTS = [
  "小炮大王今天的魔法值爆表，整个大陆都在颤抖！✨",
  "传说中的小炮大王又出手了，副本们瑟瑟发抖中…⚔️",
  "小炮大王的努力已经超越了99%的法师，太厉害了！🌟",
  "王国因您而繁荣，臣民们感激涕零！👑",
  "每一笔金币都是您智慧与努力的结晶，了不起！💰",
  "小炮大王的征途星辰大海，今天又迈出了一大步！🚀",
  "今天的小炮大王依然闪闪发光，比魔法宝石还耀眼！💎",
  "传说小炮大王从不失手，今天也要保持这个记录！⚡",
  "王国的荣耀因您而生，感谢小炮大人的每一份付出！🌈",
  "小炮大王出手，副本秒清！效率之王非您莫属！🏆",
  "每天都在进步的小炮大王，已经是传说级的存在了！🌙",
  "为了建设王国您太努力了，小炮大人辛苦啦！🏰",
  "小炮大人简直是行走的传说，今天也要加油哦！🔥",
  "有您坐镇，王国固若金汤，副本们根本不是对手！🛡️",
  "小炮大人的魔法棒一挥，金币哗哗往口袋里跑！🪄",
  "尊敬的法师大人，您今日完成的订单已超越99%的写手！🎯",
  "小炮大王的每一步都在创造历史，未来的传说属于您！📜",
  "法师大人的智慧如同星辰般璀璨，照亮了整个王国！🌌",
  "今天的小炮大王也是最棒的！继续加油，世界因您而不同！🌍",
  "小炮大王的存在就是王国最大的宝藏！💎✨",
  "每完成一个任务，小炮大王就离统一大陆更近一步！🗺️",
  "小炮大王的效率堪比闪电法术，无人能及！⚡💨",
  "传说中的效率之神降临了！小炮大王今天也是满分！💯",
  "小炮大王的金币收割速度，连龙族都自愧不如！🐉💰",
  "法师大人的魔力源源不断，今天也要大展身手！🔮",
  "小炮大王就是王国的太阳，照亮每一个角落！☀️",
  "您的每一次努力都在积累传说，小炮大王加油！📖✨",
  "小炮大王的战斗力已经突破天际，无人能挡！💪🌟",
  "今天也是被小炮大王的努力感动的一天！🥺💕",
  "小炮大王的魔法帝国正在崛起，未来无可限量！🏰🌟",
];

function getDailyCompliment(): string {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return AI_COMPLIMENTS[dayOfYear % AI_COMPLIMENTS.length];
}

// ── Encouragement messages ────────────────────────────────────────────────────
function getEncouragement(completed: number, total: number): { emoji: string; text: string } {
  if (total === 0) return { emoji: "🌅", text: "新的一天开始啦，小炮大人今天也要大杀四方！" };
  const ratio = completed / total;
  if (ratio === 0) return { emoji: "⚔️", text: "小炮大人，第一个副本等着您！冲！" };
  if (ratio < 0.3) return { emoji: "🔥", text: "已经开始了！魔法能量正在积蓄中！" };
  if (ratio < 0.5) return { emoji: "⚡", text: "快一半了！小炮大人的威名传遍四方！" };
  if (ratio < 0.7) return { emoji: "🌟", text: "超过一半！各路势力已经开始颤抖了！" };
  if (ratio < 1) return { emoji: "👑", text: "最后冲刺！统一大陆就在眼前！" };
  return { emoji: "🎉", text: "全部完成！小炮大人今天征服了整个世界！！！" };
}

// ── Level color helper ────────────────────────────────────────────────────────
function getLevelGradient(level: number): string {
  const gradients = [
    "from-slate-400 to-slate-600",
    "from-blue-400 to-blue-600",
    "from-emerald-400 to-emerald-600",
    "from-amber-400 to-amber-600",
    "from-orange-400 to-red-500",
    "from-purple-400 to-purple-600",
    "from-pink-400 to-rose-600",
    "from-cyan-400 to-blue-500",
    "from-yellow-300 to-amber-500",
  ];
  return gradients[(level - 1) % gradients.length];
}

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const todayStr = today();
  const utils = trpc.useUtils();

  // Goal dialog state
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalType, setGoalType] = useState<"weekly" | "monthly">("weekly");
  const [goalIncome, setGoalIncome] = useState("");
  const [goalOrders, setGoalOrders] = useState("");
  const [goalNote, setGoalNote] = useState("");
  const [goalBreakdown, setGoalBreakdown] = useState("");
  const [goalLoading, setGoalLoading] = useState(false);

  // Data queries
  const { data: gameProfile, isLoading: gameLoading } = trpc.game.profile.useQuery({});
  const { data: rpgData } = trpc.rpg.getProfile.useQuery();
  const { data: monthlyChart } = trpc.game.monthlyChart.useQuery({});
  const { data: clientRank } = trpc.game.clientRank.useQuery({});
  const { data: ordersData } = trpc.orders.list.useQuery({ pageSize: 200, sortBy: "deadline", sortDir: "ASC" });
  const { data: dailyGoal } = trpc.settings.getDailyGoal.useQuery({ date: todayStr });
  const { data: todayTasks = [], isLoading: tasksLoading } = trpc.orders.todayTasks.useQuery({ targetUserId: undefined });
  const { data: todaySummary } = trpc.orders.todaySummary.useQuery({ targetUserId: undefined });
  const { data: weeklyData } = trpc.drops.weeklyIncome.useQuery({});
  const setGoalMutation = trpc.game.setGoal.useMutation();

  const markComplete = trpc.orders.markComplete.useMutation({
    onSuccess: () => {
      utils.orders.todayTasks.invalidate();
      utils.orders.todaySummary.invalidate();
      utils.game.profile.invalidate();
      utils.drops.weeklyIncome.invalidate();
      toast.success("⚔️ 又拿下一个副本！经验值 +1！");
    },
    onError: () => toast.error("操作失败，请重试"),
  });

  const unmarkComplete = trpc.orders.unmarkComplete.useMutation({
    onSuccess: () => {
      utils.orders.todayTasks.invalidate();
      utils.orders.todaySummary.invalidate();
      utils.game.profile.invalidate();
      utils.drops.weeklyIncome.invalidate();
      toast.info("已撤销完成状态");
    },
  });

  const orders = ordersData?.orders ?? [];
  const activeOrders = orders.filter(o => !["已完成", "已结算"].includes(o.status));
  const urgentOrders = activeOrders.filter(o => { const d = daysUntil(o.deadline); return d !== null && d >= 0 && d <= 3; });
  const overdueOrders = activeOrders.filter(o => { const d = daysUntil(o.deadline); return d !== null && d < 0; });

  // ── AI Compliment Scrolling Ticker (2 lines, alternating) ──────────────────
  const [tickerLine1, setTickerLine1] = useState(0);
  const [tickerLine2, setTickerLine2] = useState(1);
  const [tickerFade, setTickerFade] = useState({ line1: true, line2: true });

  useEffect(() => {
    let idx = 2;
    const interval = setInterval(() => {
      // Alternate between line1 and line2
      if (idx % 2 === 0) {
        setTickerFade(f => ({ ...f, line1: false }));
        setTimeout(() => {
          setTickerLine1(idx % AI_COMPLIMENTS.length);
          setTickerFade(f => ({ ...f, line1: true }));
        }, 500);
      } else {
        setTickerFade(f => ({ ...f, line2: false }));
        setTimeout(() => {
          setTickerLine2(idx % AI_COMPLIMENTS.length);
          setTickerFade(f => ({ ...f, line2: true }));
        }, 500);
      }
      idx++;
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const pendingTasks = todayTasks.filter(t => !["已完成", "已结算"].includes(t.status));
  const completedTodayTasks = todayTasks.filter(t => ["已完成", "已结算"].includes(t.status));
  const totalTasks = todayTasks.length;
  const completedCount = completedTodayTasks.length;
  const taskProgress = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const encouragement = useMemo(() => getEncouragement(completedCount, totalTasks), [completedCount, totalTasks]);

  const handleSetGoal = async () => {
    if (!goalIncome) return;
    setGoalLoading(true);
    try {
      const result = await setGoalMutation.mutateAsync({
        type: goalType,
        targetIncome: parseFloat(goalIncome),
        targetOrders: goalOrders ? parseInt(goalOrders) : undefined,
        note: goalNote || undefined,
      });
      setGoalBreakdown(typeof result.breakdown === 'string' ? result.breakdown : JSON.stringify(result.breakdown));
    } catch {
      toast.error("目标设定失败");
    } finally {
      setGoalLoading(false);
    }
  };

  // Chart colors
  const chartColors = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* ── HERO: Magic Conquest Banner ─────────────────────────────────── */}
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${getLevelGradient(gameProfile?.level ?? 1)} p-6 text-white shadow-lg min-h-[180px]`}>
          {/* Decorative orbs */}
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/10 blur-xl" />

          {/* Character illustration — right side: show user's pixel avatar */}
          <div className="absolute right-4 bottom-0 h-[200px] w-[160px] pointer-events-none select-none hidden md:flex items-end justify-center pb-2">
            {(() => {
              const avatarConfig: AvatarConfig = (() => {
                try {
                  return rpgData?.profile?.avatarConfig
                    ? JSON.parse(rpgData.profile.avatarConfig)
                    : DEFAULT_AVATAR;
                } catch {
                  return DEFAULT_AVATAR;
                }
              })();
              return <PixelAvatarDisplay config={avatarConfig} size="xl" animated />;
            })()}
          </div>

          <div className="relative flex flex-col gap-3 md:pr-44">
            {/* Top row: level badge + name + stats */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
              {/* Level + title */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl shrink-0 shadow-inner">
                  {gameProfile?.emoji ?? "🧙"}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white/80 text-sm font-medium">Lv.{gameProfile?.level ?? 1}</span>
                    <Badge className="bg-white/20 text-white border-0 text-xs hover:bg-white/30">
                      {gameProfile?.title ?? "见习法师"}
                    </Badge>
                  </div>
                  {/* Dynamic name: show current user's display name */}
                  <p className="text-xl font-extrabold tracking-wide">
                    尊敬的{(user?.role === "admin" || user?.role === "owner") ? "✨" : ""}{rpgData?.profile?.nickname || user?.name || "居民"}
                  </p>
                </div>
              </div>

              {/* Stats row */}
              <div className="sm:ml-auto flex flex-wrap gap-4 shrink-0">
                <div className="text-center">
                  <p className="text-2xl font-bold">¥{(gameProfile?.totalIncome ?? 0).toLocaleString()}</p>
                  <p className="text-white/70 text-xs">累计魔法金币</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold flex items-center gap-1">
                    <Flame className="w-5 h-5 text-orange-300" />
                    {gameProfile?.streakDays ?? 0}
                  </p>
                  <p className="text-white/70 text-xs">连续征战天</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{gameProfile?.totalCompleted ?? 0}</p>
                  <p className="text-white/70 text-xs">已征服副本</p>
                </div>
              </div>
            </div>

            {/* ── AI Compliment Scrolling Ticker (2 lines) ──────────────────── */}
            <div className="bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base shrink-0">🎀</span>
                <p
                  className="text-sm font-medium flex-1 truncate"
                  style={{
                    opacity: tickerFade.line1 ? 1 : 0,
                    transform: tickerFade.line1 ? "translateY(0)" : "translateY(-8px)",
                    transition: "opacity 0.5s ease, transform 0.5s ease",
                  }}
                >
                  {AI_COMPLIMENTS[tickerLine1]}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base shrink-0">💫</span>
                <p
                  className="text-sm font-medium flex-1 truncate"
                  style={{
                    opacity: tickerFade.line2 ? 1 : 0,
                    transform: tickerFade.line2 ? "translateY(0)" : "translateY(8px)",
                    transition: "opacity 0.5s ease, transform 0.5s ease",
                  }}
                >
                  {AI_COMPLIMENTS[tickerLine2]}
                </p>
              </div>
            </div>
          </div>

          {/* XP progress bar */}
          <div className="relative mt-3 md:pr-44">
            <div className="flex justify-between text-xs text-white/70 mb-1.5">
              <span>距离下一级：{gameProfile?.nextLevel?.title ?? "已是最强"}</span>
              <span>{gameProfile?.progress ?? 0}%</span>
            </div>
            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/80 rounded-full transition-all duration-700"
                style={{ width: `${gameProfile?.progress ?? 0}%` }}
              />
            </div>
            {gameProfile?.nextLevel && (
              <p className="text-xs text-white/60 mt-1">
                还需 ¥{((gameProfile.nextLevel.minIncome ?? 0) - (gameProfile.totalIncome ?? 0)).toLocaleString()} 魔法金币升级
              </p>
            )}
          </div>
        </div>

        {/* ── Alerts (including settle issues) ─────────────────────────── */}
        {(overdueOrders.length > 0 || urgentOrders.length > 0 || orders.filter(o => o.settleStatus === "异常核实中").length > 0 || orders.filter(o => o.submissionStatus === "收货待提交").length > 0) && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {overdueOrders.length > 0 && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-700 text-sm">{overdueOrders.length} 个副本已超时！</p>
                  <p className="text-xs text-red-600 mt-0.5">法师大人，这些任务需要立即处理！</p>
                </div>
                <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-100 -mr-1 h-7 text-xs" onClick={() => setLocation("/orders")}>
                  查看 <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            )}
            {urgentOrders.length > 0 && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-700 text-sm">{urgentOrders.length} 个副本即将截止</p>
                  <p className="text-xs text-amber-600 mt-0.5">3天内需要完成，请抓紧时间！</p>
                </div>
                <Button variant="ghost" size="sm" className="text-amber-600 hover:bg-amber-100 -mr-1 h-7 text-xs" onClick={() => setLocation("/orders")}>
                  查看 <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            )}
            {orders.filter(o => o.settleStatus === "异常核实中").length > 0 && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-700 text-sm">{orders.filter(o => o.settleStatus === "异常核实中").length} 个结算异常</p>
                  <p className="text-xs text-red-600 mt-0.5">需要核实处理</p>
                </div>
                <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-100 -mr-1 h-7 text-xs" onClick={() => setLocation("/orders")}>
                  查看 <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            )}
            {orders.filter(o => o.submissionStatus === "收货待提交").length > 0 && (
              <div className="flex items-start gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                <Package className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-purple-700 text-sm">{orders.filter(o => o.submissionStatus === "收货待提交").length} 个收货待提交</p>
                  <p className="text-xs text-purple-600 mt-0.5">等待收货后提交</p>
                </div>
                <Button variant="ghost" size="sm" className="text-purple-600 hover:bg-purple-100 -mr-1 h-7 text-xs" onClick={() => setLocation("/orders")}>
                  查看 <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── 3-Dimension Income Cards (Today / This Week / This Month) ──── */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-100">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-amber-700 font-medium">今日金币</span>
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-amber-800">{formatAmount(String(gameProfile?.todayIncome ?? 0))}</p>
              <p className="text-xs text-amber-600 mt-1">完成 {gameProfile?.completedToday ?? 0} 个副本</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-blue-700 font-medium">本周金币</span>
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-blue-800">{formatAmount(String(weeklyData?.thisWeekIncome ?? 0))}</p>
              <p className="text-xs text-blue-600 mt-1">完成 {weeklyData?.thisWeekCompleted ?? 0} 个副本</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-green-700 font-medium">本月金币</span>
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-green-800">{formatAmount(String(gameProfile?.thisMonthIncome ?? 0))}</p>
              <p className="text-xs text-green-600 mt-1">本月收入</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-medium">待收款</span>
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                </div>
              </div>
              <p className="text-2xl font-bold">{formatAmount(String(todaySummary?.pendingSettlement ?? 0))}</p>
              <p className="text-xs text-muted-foreground mt-1">待结算金额</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-medium">进行中</span>
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Swords className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold">{activeOrders.length}</p>
              <p className="text-xs text-muted-foreground mt-1">共 {orders.length} 个副本</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Main Content: Left (Tasks + Charts) / Right (Today Orders) ──── */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Work Checklist */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardHeader className="pb-0 pt-5 px-6">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Swords className="w-4 h-4 text-primary" />
                    今日副本清单
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm">
                    {todaySummary && (
                      <>
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          今日完成 <span className="font-bold text-foreground">{todaySummary.completedToday}</span> 单
                        </span>
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                          入账 <span className="font-bold text-emerald-600">{formatAmount(String(todaySummary.completedIncome))}</span>
                        </span>
                      </>
                    )}
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setLocation("/orders")}>
                      管理 <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-6 pt-4 pb-5">
                {/* Progress */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-1.5 text-primary">
                      <span className="text-base">{encouragement.emoji}</span>
                      {encouragement.text}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">{completedCount} / {totalTasks}</span>
                  </div>
                  <Progress value={taskProgress} className="h-2.5" />
                </div>

                {tasksLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-muted/40 rounded-lg animate-pulse" />)}</div>
                ) : totalTasks === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">今日没有待处理的副本</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">好好休息，或者去接新单吧～</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {pendingTasks.map(task => {
                      const days = daysUntil(task.deadline);
                      const isOverdue = days !== null && days < 0;
                      const isUrgent = days !== null && days >= 0 && days <= 2;
                      return (
                        <div key={task.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isOverdue ? "border-red-200 bg-red-50/50" : isUrgent ? "border-amber-200 bg-amber-50/50" : "border-border bg-card hover:bg-muted/30"}`}>
                          <button
                            className="shrink-0 w-5 h-5 rounded-full border-2 border-muted-foreground/30 hover:border-green-500 hover:bg-green-50 transition-all flex items-center justify-center group"
                            onClick={() => markComplete.mutate({ id: task.id })}
                            disabled={markComplete.isPending}
                            title="完成副本"
                          >
                            <Circle className="w-3 h-3 text-muted-foreground/30 group-hover:text-green-500" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{task.title || task.orderId || `#${task.id}`}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <StatusBadge status={task.status} size="sm" />
                              {task.clientService && <span className="text-xs text-muted-foreground">{task.clientService}</span>}
                              {task.amount && <span className="text-xs font-semibold text-emerald-600">{formatAmount(task.amount)}</span>}
                            </div>
                          </div>
                          <span className={`text-xs font-medium whitespace-nowrap ${isOverdue ? "text-red-600" : isUrgent ? "text-amber-600" : "text-muted-foreground"}`}>
                            {formatRelativeDate(task.deadline)}
                          </span>
                        </div>
                      );
                    })}
                    {completedTodayTasks.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-dashed border-border/60">
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-green-500" />
                          今日已征服 ({completedTodayTasks.length})
                        </p>
                        {completedTodayTasks.map(task => (
                          <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl border border-green-100 bg-green-50/40 mb-2 opacity-70">
                            <button
                              className="shrink-0 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-400 transition-colors"
                              onClick={() => unmarkComplete.mutate({ id: task.id })}
                              disabled={unmarkComplete.isPending}
                              title="撤销完成"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium line-through text-muted-foreground truncate">{task.title || task.orderId || `#${task.id}`}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <StatusBadge status={task.status} size="sm" />
                                {task.amount && <span className="text-xs font-semibold text-emerald-600">{formatAmount(task.amount)}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Monthly income trend */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    收入趋势（近12月）
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {monthlyChart?.months && monthlyChart.months.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={monthlyChart.months} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={v => v.substring(5)} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `¥${(v/1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => [`¥${v.toLocaleString()}`, "收入"]} />
                        <Area type="monotone" dataKey="income" stroke="#6366f1" strokeWidth={2} fill="url(#incomeGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">暂无数据</div>
                  )}
                </CardContent>
              </Card>

              {/* Client ranking */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-500" />
                    客服排行榜
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(clientRank?.ranks ?? []).slice(0, 6).map((r, i) => (
                      <div key={r.name} className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-400 text-white" : i === 2 ? "bg-orange-400 text-white" : "bg-muted text-muted-foreground"
                        }`}>{r.rank}</span>
                        <span className="flex-1 text-sm truncate">{r.name}</span>
                        <span className="text-xs font-semibold text-emerald-600">¥{r.income.toLocaleString()}</span>
                      </div>
                    ))}
                    {(clientRank?.ranks ?? []).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">暂无数据</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Sidebar: 1/3 width */}
          <div className="space-y-6">
            {/* Achievements */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  成就殿堂
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2">
                  {(gameProfile?.allAchievements ?? []).map(a => (
                    <div
                      key={a.id}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg text-center transition-all ${
                        a.unlocked
                          ? "bg-amber-50 border border-amber-200 shadow-sm"
                          : "border-border bg-muted/30 opacity-40 grayscale"
                      }`}
                      title={a.desc}
                    >
                      <span className="text-xl">{a.emoji}</span>
                      <span className="text-xs font-medium leading-tight">{a.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Goal Setting */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    征战目标
                  </CardTitle>
                  <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="h-7 text-xs gap-1">
                        <Star className="w-3 h-3" /> 设定目标
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Crown className="w-5 h-5 text-amber-500" />
                          设定征战目标
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div className="flex gap-2">
                          {(["weekly", "monthly"] as const).map(t => (
                            <Button
                              key={t}
                              variant={goalType === t ? "default" : "outline"}
                              size="sm"
                              onClick={() => setGoalType(t)}
                              className="flex-1"
                            >
                              {t === "weekly" ? "本周目标" : "本月目标"}
                            </Button>
                          ))}
                        </div>
                        <div>
                          <Label className="text-sm">目标金额（魔法金币）</Label>
                          <Input type="number" placeholder="例如：5000" value={goalIncome} onChange={e => setGoalIncome(e.target.value)} className="mt-1.5" />
                        </div>
                        <div>
                          <Label className="text-sm">目标订单数（可选）</Label>
                          <Input type="number" placeholder="例如：10" value={goalOrders} onChange={e => setGoalOrders(e.target.value)} className="mt-1.5" />
                        </div>
                        <div>
                          <Label className="text-sm">备注（可选）</Label>
                          <Textarea placeholder="例如：这周要多接文章类订单" value={goalNote} onChange={e => setGoalNote(e.target.value)} className="mt-1.5 h-20 resize-none" />
                        </div>
                        <Button onClick={handleSetGoal} disabled={!goalIncome || goalLoading} className="w-full gap-2">
                          <Bot className="w-4 h-4" />
                          {goalLoading ? "AI 正在拆解目标..." : "AI 智能拆解目标"}
                        </Button>
                        {goalBreakdown && (
                          <div className="rounded-xl bg-muted/50 p-4 text-sm">
                            <Streamdown>{goalBreakdown}</Streamdown>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {/* Streak display */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 mb-4">
                  <div className="text-3xl">
                    {(gameProfile?.streakDays ?? 0) >= 7 ? "🔥" : (gameProfile?.streakDays ?? 0) >= 3 ? "⚡" : "✨"}
                  </div>
                  <div>
                    <p className="font-bold text-orange-700">连续征战 {gameProfile?.streakDays ?? 0} 天</p>
                    <p className="text-xs text-orange-600">
                      {(gameProfile?.streakDays ?? 0) >= 7
                        ? "传说级连击！帝国军威震天下！"
                        : (gameProfile?.streakDays ?? 0) >= 3
                        ? "连胜势头正旺，继续保持！"
                        : "开始连胜吧，法师大人！"}
                    </p>
                  </div>
                </div>
                {dailyGoal?.targetWords ? (
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">今日字数</span>
                        <span className="font-medium">{dailyGoal.actualWords ?? 0} / {dailyGoal.targetWords}</span>
                      </div>
                      <Progress value={Math.min(100, ((dailyGoal.actualWords ?? 0) / dailyGoal.targetWords) * 100)} className="h-2" />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">点击"设定目标"，让 AI 帮您规划征战计划！</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  快捷入口
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="h-auto py-3 flex flex-col gap-1" onClick={() => setLocation("/calendar")}>
                    <CalendarDays className="w-4 h-4 text-blue-500" />
                    <span className="text-xs">日历行程</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-auto py-3 flex flex-col gap-1" onClick={() => setLocation("/todo-quadrant")}>
                    <Target className="w-4 h-4 text-purple-500" />
                    <span className="text-xs">四象限</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-auto py-3 flex flex-col gap-1" onClick={() => setLocation("/ai-planner")}>
                    <Bot className="w-4 h-4 text-green-500" />
                    <span className="text-xs">AI规划</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-auto py-3 flex flex-col gap-1" onClick={() => setLocation("/inventory")}>
                    <Gift className="w-4 h-4 text-amber-500" />
                    <span className="text-xs">我的背包</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Three-dimension Status Distribution ──────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                写作状态分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {["待开始", "进行中", "修改中", "已完成"].map(status => {
                  const count = orders.filter(o => o.writingStatus === status).length;
                  return (
                    <div key={status} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/50 rounded-lg">
                      <WritingStatusBadge status={status} size="sm" />
                      <span className="text-sm font-bold">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-500" />
                提交状态分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {["未提交", "收货待提交", "待提交", "已提交"].map(status => {
                  const count = orders.filter(o => o.submissionStatus === status).length;
                  return (
                    <div key={status} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/50 rounded-lg">
                      <SubmissionStatusBadge status={status} size="sm" />
                      <span className="text-sm font-bold">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                结算状态分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {["未结算", "待结算", "异常核实中", "已结算"].map(status => {
                  const count = orders.filter(o => o.settleStatus === status).length;
                  return (
                    <div key={status} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/50 rounded-lg">
                      <SettleStatusBadge status={status} size="sm" />
                      <span className="text-sm font-bold">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </DashboardLayout>
  );
}
