import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { formatAmount } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { TrendingUp, DollarSign, FileText, AlertTriangle, Clock, Package, FileEdit } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
const WRITING_COLORS: Record<string, string> = {
  "待开始": "#94a3b8", "进行中": "#3b82f6", "修改中": "#f59e0b", "已完成": "#10b981", "初稿待提交": "#60a5fa", "修改": "#fbbf24",
};
const SUBMISSION_COLORS: Record<string, string> = {
  "未提交": "#94a3b8", "收货待提交": "#8b5cf6", "待提交": "#f59e0b", "已提交": "#10b981",
};
const SETTLE_COLORS: Record<string, string> = {
  "未结算": "#94a3b8", "待结算": "#f97316", "异常核实中": "#ef4444", "已结算": "#10b981",
};

export default function Stats() {
  const { data: stats, isLoading } = trpc.stats.get.useQuery({});

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center min-h-64">
          <p className="text-muted-foreground">加载统计数据...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!stats) return <DashboardLayout><div className="p-6">暂无数据</div></DashboardLayout>;

  const statusData = Object.entries(stats.statusCounts).map(([name, value]) => ({ name, value }));

  // 三维度状态数据
  const writingStatusData = stats.writingStatusCounts
    ? Object.entries(stats.writingStatusCounts).map(([name, value]) => ({ name, value, fill: WRITING_COLORS[name] || "#94a3b8" }))
    : [];
  const submissionStatusData = stats.submissionStatusCounts
    ? Object.entries(stats.submissionStatusCounts).map(([name, value]) => ({ name, value, fill: SUBMISSION_COLORS[name] || "#94a3b8" }))
    : [];
  const settleStatusData = stats.settleStatusCounts
    ? Object.entries(stats.settleStatusCounts).map(([name, value]) => ({ name, value, fill: SETTLE_COLORS[name] || "#94a3b8" }))
    : [];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-xl font-bold tracking-tight">收入统计</h1>
          <p className="text-sm text-muted-foreground mt-0.5">全面了解您的写作收入与订单情况</p>
        </div>

        {/* Summary cards - 6 cards with new dimensions */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            { label: "累计已结算", value: formatAmount(String(stats.totalSettled)), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-100" },
            { label: "待结算金额", value: formatAmount(String(stats.totalPending)), icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-100" },
            { label: "异常金额", value: formatAmount(String((stats as any).totalDisputed ?? 0)), icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100" },
            { label: "总订单数", value: String(stats.totalOrders), icon: FileText, color: "text-blue-600", bg: "bg-blue-100" },
            { label: "本月收入", value: formatAmount(String(stats.thisMonthIncome)), icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-100" },
            { label: "本月订单", value: String(stats.thisMonthOrders), icon: FileEdit, color: "text-cyan-600", bg: "bg-cyan-100" },
          ].map((item) => (
            <Card key={item.label} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-muted-foreground font-medium">{item.label}</span>
                  <div className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center`}>
                    <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                  </div>
                </div>
                <p className="text-xl font-bold">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Alerts - including disputed */}
        {(stats.overdueOrders > 0 || stats.urgentOrders > 0 || ((stats as any).disputedOrders ?? 0) > 0 || ((stats as any).pendingSubmitOrders ?? 0) > 0) && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.overdueOrders > 0 && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="font-semibold text-red-700 text-sm">{stats.overdueOrders} 个订单已逾期</p>
                  <p className="text-xs text-red-500">请尽快处理</p>
                </div>
              </div>
            )}
            {stats.urgentOrders > 0 && (
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <Clock className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="font-semibold text-amber-700 text-sm">{stats.urgentOrders} 个订单 7 天内截止</p>
                  <p className="text-xs text-amber-500">注意时间安排</p>
                </div>
              </div>
            )}
            {((stats as any).disputedOrders ?? 0) > 0 && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="font-semibold text-red-700 text-sm">{(stats as any).disputedOrders} 个结算异常</p>
                  <p className="text-xs text-red-500">需要核实处理</p>
                </div>
              </div>
            )}
            {((stats as any).pendingSubmitOrders ?? 0) > 0 && (
              <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                <Package className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="font-semibold text-purple-700 text-sm">{(stats as any).pendingSubmitOrders} 个收货待提交</p>
                  <p className="text-xs text-purple-500">等待收货后提交</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Monthly income chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">月度收入趋势</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.monthlyIncome.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">暂无结算数据</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.monthlyIncome} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `¥${v}`} />
                    <Tooltip formatter={(v: number) => [`¥${v.toFixed(2)}`, "收入"]} labelFormatter={(l) => `${l}月`} />
                    <Bar dataKey="income" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Settle status pie chart (NEW) */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" /> 结算状态分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              {settleStatusData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">暂无数据</p>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie data={settleStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                        {settleStatusData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {settleStatusData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2 text-xs">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: item.fill }} />
                        <span className="text-muted-foreground">{item.name}</span>
                        <span className="font-semibold ml-auto">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Writing status pie chart (NEW) */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileEdit className="w-4 h-4 text-blue-500" /> 写作状态分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              {writingStatusData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">暂无数据</p>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie data={writingStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                        {writingStatusData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {writingStatusData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2 text-xs">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: item.fill }} />
                        <span className="text-muted-foreground">{item.name}</span>
                        <span className="font-semibold ml-auto">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submission status pie chart (NEW) */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-500" /> 提交状态分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              {submissionStatusData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">暂无数据</p>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie data={submissionStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                        {submissionStatusData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {submissionStatusData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2 text-xs">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: item.fill }} />
                        <span className="text-muted-foreground">{item.name}</span>
                        <span className="font-semibold ml-auto">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client service ranking */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">客服排行（订单数）</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.clientServiceRank.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">暂无数据</p>
              ) : (
                <div className="space-y-2">
                  {stats.clientServiceRank.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {i + 1}
                      </span>
                      <span className="flex-1 text-sm truncate">{item.name}</span>
                      <span className="text-xs text-muted-foreground">{item.count} 单</span>
                      <span className="text-xs font-medium text-emerald-600">{formatAmount(String(item.income))}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Designer ranking */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">设计师排行（收入）</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.designerRank.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">暂无数据</p>
              ) : (
                <div className="space-y-2">
                  {stats.designerRank.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {i + 1}
                      </span>
                      <span className="flex-1 text-sm truncate">{item.name}</span>
                      <span className="text-xs text-muted-foreground">{item.count} 单</span>
                      <span className="text-xs font-medium text-emerald-600">{formatAmount(String(item.income))}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Weekly trend */}
        {stats.weeklyOrders.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">近8周订单趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={stats.weeklyOrders} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="订单数" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
