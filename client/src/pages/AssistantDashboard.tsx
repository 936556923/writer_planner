import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { formatAmount } from "@/lib/utils";
import {
  Users, Handshake, Trophy, Sparkles, TrendingUp, CheckCircle2,
  Zap, Star, Heart, ArrowRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

// ── Motivational messages for assistant ──────────────────────────────────────
const ASSISTANT_COMPLIMENTS = [
  "你是最棒的助理！团队因你而更强大！💪",
  "每一个协助完成的订单，都是你价值的体现！🌟",
  "助理大人辛苦了，你的付出大家都看在眼里！❤️",
  "有你在，小炮大王可以更加专注于创作！✨",
  "今天也是元气满满的一天，继续加油！🔥",
  "你的效率让整个团队都惊叹不已！⚡",
  "协作的力量是无穷的，感谢你的每一份贡献！🤝",
  "助理大人的存在就是团队最大的幸运！🍀",
];

export default function AssistantDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [complimentIdx, setComplimentIdx] = useState(0);
  const [fade, setFade] = useState(true);

  // Rotate compliments
  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setComplimentIdx(i => (i + 1) % ASSISTANT_COMPLIMENTS.length);
        setFade(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Data queries — using existing game profile and orders
  const { data: gameProfile } = trpc.game.profile.useQuery({});
  const { data: ordersData } = trpc.orders.list.useQuery({ pageSize: 200 });
  const { data: todaySummary } = trpc.orders.todaySummary.useQuery({ targetUserId: undefined });

  const orders = ordersData?.orders ?? [];
  // In a real implementation, filter orders by assistantId === user.id
  // For now, show all orders as "collaborated"
  const collaboratedOrders = orders.filter(o => ["已完成", "已结算"].includes(o.status));
  const activeCollabs = orders.filter(o => !["已完成", "已结算"].includes(o.status));

  const totalCollabIncome = collaboratedOrders.reduce((sum, o) => {
    const amt = parseFloat(o.amount || "0");
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">

        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-6 text-white shadow-lg">
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/10 blur-xl" />

          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl">
                🤝
              </div>
              <div>
                <Badge className="bg-white/20 text-white border-0 text-xs">助理面板</Badge>
                <p className="text-xl font-extrabold mt-1">
                  {user?.name || "助理"}的协作中心
                </p>
              </div>
            </div>

            {/* Scrolling compliment */}
            <div className="bg-white/10 rounded-xl px-4 py-2.5 backdrop-blur-sm">
              <p
                className="text-sm font-medium"
                style={{
                  opacity: fade ? 1 : 0,
                  transform: fade ? "translateY(0)" : "translateY(-6px)",
                  transition: "opacity 0.4s ease, transform 0.4s ease",
                }}
              >
                💫 {ASSISTANT_COMPLIMENTS[complimentIdx]}
              </p>
            </div>
          </div>
        </div>

        {/* Collaboration Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-cyan-50 to-blue-50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-cyan-700 font-medium">共同完成</span>
                <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
                  <Handshake className="w-4 h-4 text-cyan-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-cyan-800">{collaboratedOrders.length}</p>
              <p className="text-xs text-cyan-600 mt-1">个协作订单</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-green-700 font-medium">协作金额</span>
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-green-800">{formatAmount(String(totalCollabIncome))}</p>
              <p className="text-xs text-green-600 mt-1">总协作金额</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-yellow-50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-amber-700 font-medium">今日完成</span>
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-amber-800">{todaySummary?.completedToday ?? 0}</p>
              <p className="text-xs text-amber-600 mt-1">今日协作完成</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-violet-50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-purple-700 font-medium">进行中</span>
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-purple-800">{activeCollabs.length}</p>
              <p className="text-xs text-purple-600 mt-1">正在协作中</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Collaborations */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                当前协作订单
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setLocation("/orders")}>
                查看全部 <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {activeCollabs.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">暂无进行中的协作订单</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {activeCollabs.slice(0, 10).map(order => (
                  <div key={order.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 transition-all">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Handshake className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{order.title || order.orderId || `#${order.id}`}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-xs">{order.status}</Badge>
                        {order.clientService && <span className="text-xs text-muted-foreground">{order.clientService}</span>}
                      </div>
                    </div>
                    {order.amount && (
                      <span className="text-sm font-semibold text-emerald-600">{formatAmount(order.amount)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Motivation section */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-pink-50 to-rose-50 border-pink-100">
          <CardContent className="p-6 text-center">
            <Heart className="w-8 h-8 text-pink-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-pink-700">你是团队不可或缺的一员！</h3>
            <p className="text-sm text-pink-600 mt-2">
              每一个协助完成的订单，都在为团队的成功添砖加瓦。
              继续保持这份热情，一起创造更多的可能！
            </p>
            <div className="flex justify-center gap-4 mt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-pink-700">{collaboratedOrders.length}</p>
                <p className="text-xs text-pink-500">总协作数</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-pink-700">{gameProfile?.streakDays ?? 0}</p>
                <p className="text-xs text-pink-500">连续在线</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-pink-700">
                  {gameProfile?.level ?? 1}
                </p>
                <p className="text-xs text-pink-500">当前等级</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
