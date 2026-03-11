import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ShieldCheck, Users, Coins, Megaphone, Zap, AlertTriangle, Trash2, Pin } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

// ── Status options ─────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "dungeon" as const, label: "⚔️ 副本中", desc: "正在征讨副本" },
  { value: "working" as const, label: "🏋️ 健身中", desc: "修炼魔力中" },
  { value: "eating" as const, label: "🍜 吃饭中", desc: "补充魔力中" },
  { value: "playing_dog" as const, label: "🐕 玩狗中", desc: "和大黄狗玩耍" },
  { value: "slacking" as const, label: "🐟 摸鱼中", desc: "战略性休息" },
  { value: "sleeping" as const, label: "😴 睡觉中", desc: "夜间模式" },
];

type StatusValue = typeof STATUS_OPTIONS[number]["value"];

const ROLE_LABELS: Record<string, string> = {
  owner: "法师大人",
  admin: "管理员",
  assistant: "助理",
  user: "普通用户",
  resident: "居民",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-yellow-100 text-yellow-700",
  admin: "bg-blue-100 text-blue-700",
  assistant: "bg-purple-100 text-purple-700",
  user: "bg-gray-100 text-gray-600",
  resident: "bg-gray-100 text-gray-600",
};

type Tab = "status" | "announcements" | "coins" | "users" | "payment";

export default function AdminPanel() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<Tab>("status");

  // ── Status state ──────────────────────────────────────────────────────────────
  const [selectedStatus, setSelectedStatus] = useState<StatusValue>("dungeon");
  const [customMessage, setCustomMessage] = useState("");

  // ── Announcement state ────────────────────────────────────────────────────────
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annPinned, setAnnPinned] = useState(false);

  // ── Coin grant state ──────────────────────────────────────────────────────────
  const [coinUserId, setCoinUserId] = useState<number | null>(null);
  const [coinAmount, setCoinAmount] = useState("");
  const [coinNote, setCoinNote] = useState("");

  // ── Payment QR state ──────────────────────────────────────────────────────────
  const [qrPlatform, setQrPlatform] = useState<"wechat" | "alipay">("wechat");
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [qrThankMsg, setQrThankMsg] = useState("");

  // ── Role checks (owner+admin merged into admin) ──────────────────
  const isOwnerOrAdmin = user?.role === "admin" || user?.role === "owner";
  const isOwner = user?.role === "admin" || user?.role === "owner";

  // ── Queries ───────────────────────────────────────────────────────────────────
  const { data: statusData } = trpc.plaza.getStatus.useQuery(undefined, {
    enabled: isOwnerOrAdmin,
    onSuccess: (d: any) => {
      if (d?.status) setSelectedStatus(d.status as StatusValue);
      if (d?.customMessage) setCustomMessage(d.customMessage);
    },
  } as any);

  const { data: announcements, refetch: refetchAnn } = trpc.plaza.listAnnouncements.useQuery(undefined, {
    enabled: isOwnerOrAdmin,
  });

  const { data: plazaUsers } = trpc.plaza.listUsers.useQuery(undefined, {
    enabled: isOwnerOrAdmin,
  });

  const { data: coinHistory } = trpc.plaza.coinGrantHistory.useQuery(undefined, {
    enabled: isOwner,
  });

  const { data: paymentCodes } = trpc.plaza.getPaymentQR.useQuery(undefined, {
    enabled: isOwner,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const setStatusMutation = trpc.plaza.setStatus.useMutation({
    onSuccess: () => {
      toast.success("✅ 状态已更新，广场居民已收到通知！");
      utils.plaza.getStatus.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const createAnnMutation = trpc.plaza.createAnnouncement.useMutation({
    onSuccess: () => {
      toast.success("📢 公告已发布！");
      setAnnTitle(""); setAnnContent(""); setAnnPinned(false);
      refetchAnn();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteAnnMutation = trpc.plaza.deleteAnnouncement.useMutation({
    onSuccess: () => { toast.success("公告已删除"); refetchAnn(); },
    onError: (e) => toast.error(e.message),
  });

  const grantCoinsMutation = trpc.plaza.grantCoins.useMutation({
    onSuccess: (d) => {
      toast.success(`🪙 金币发放成功！新余额：${d.newBalance}（已实时同步给对方）`);
      setCoinAmount(""); setCoinNote(""); setCoinUserId(null);
      utils.plaza.coinGrantHistory.invalidate();
      utils.plaza.listUsers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const upsertQRMutation = trpc.plaza.upsertPaymentQR.useMutation({
    onSuccess: () => {
      toast.success("收款码已保存！");
      utils.plaza.getPaymentQR.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateRoleMutation = trpc.plaza.updateUserRole.useMutation({
    onSuccess: () => { toast.success("角色已更新"); utils.plaza.listUsers.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  // ── Access guard ──────────────────────────────────────────────────────────────
  if (!isOwnerOrAdmin) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-64 gap-4">
          <AlertTriangle className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground">您没有权限访问管理后台</p>
          <Button variant="outline" onClick={() => setLocation("/")}>返回首页</Button>
        </div>
      </DashboardLayout>
    );
  }

  // ── Tab config ────────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ReactNode; ownerOnly?: boolean }[] = [
    { id: "status", label: "状态切换", icon: <Zap className="w-4 h-4" /> },
    { id: "announcements", label: "王国公告", icon: <Megaphone className="w-4 h-4" /> },
    { id: "coins", label: "金币发放", icon: <Coins className="w-4 h-4" /> },
    { id: "users", label: "用户管理", icon: <Users className="w-4 h-4" /> },
    { id: "payment", label: "收款码", icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            魔法世界管理后台
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            法师大人的专属控制台，管理王国的一切事务
          </p>
        </div>

        {/* Stats row */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          {[
            { label: "总居民数", value: plazaUsers?.length ?? 0, color: "text-blue-600" },
            { label: "当前状态", value: STATUS_OPTIONS.find((s) => s.value === (statusData?.status ?? "dungeon"))?.label ?? "未知", color: "text-purple-600" },
            { label: "公告数量", value: announcements?.length ?? 0, color: "text-orange-600" },
            { label: "金币记录", value: coinHistory?.length ?? 0, color: "text-yellow-600" },
          ].map((item) => (
            <Card key={item.label} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                <p className={`text-base font-bold ${item.color}`}>{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 flex-wrap border-b">
          {tabs.filter((t) => !t.ownerOnly || isOwner).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors -mb-px ${
                activeTab === tab.id
                  ? "bg-background border border-b-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Status tab ─────────────────────────────────────────────────────── */}
        {activeTab === "status" && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                切换法师大人的当前状态
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedStatus(opt.value)}
                    className={`p-3 rounded-xl text-left transition-all border-2 ${
                      selectedStatus === opt.value
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40 bg-muted/30"
                    }`}
                  >
                    <p className="font-semibold text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  自定义状态消息（可选，会显示在广场）
                </label>
                <Input
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="例如：正在赶稿，预计2小时后回来～"
                  maxLength={200}
                />
              </div>
              <Button
                onClick={() => setStatusMutation.mutate({ status: selectedStatus, customMessage: customMessage || undefined })}
                disabled={setStatusMutation.isPending}
                className="w-full sm:w-auto"
              >
                {setStatusMutation.isPending ? "更新中..." : "✅ 更新状态并通知广场"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Announcements tab ──────────────────────────────────────────────── */}
        {activeTab === "announcements" && (
          <div className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-primary" />
                  发布新公告
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="公告标题"
                  maxLength={100}
                />
                <Textarea
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  placeholder="公告内容（支持换行）"
                  rows={4}
                  maxLength={2000}
                />
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={annPinned}
                      onChange={(e) => setAnnPinned(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-muted-foreground">📌 置顶公告</span>
                  </label>
                  <Button
                    onClick={() => {
                      if (!annTitle.trim() || !annContent.trim()) {
                        toast.error("标题和内容不能为空");
                        return;
                      }
                      createAnnMutation.mutate({ title: annTitle, content: annContent, isPinned: annPinned });
                    }}
                    disabled={createAnnMutation.isPending}
                    className="ml-auto"
                  >
                    {createAnnMutation.isPending ? "发布中..." : "📢 发布公告"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">已发布的公告</CardTitle>
              </CardHeader>
              <CardContent>
                {!announcements || announcements.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">暂无公告</p>
                ) : (
                  <div className="space-y-3">
                    {announcements.map((ann: any) => (
                      <div key={ann.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                        {ann.isPinned && <Pin className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{ann.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ann.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(ann.createdAt).toLocaleDateString("zh-CN")}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive flex-shrink-0"
                          onClick={() => {
                            if (confirm("确定删除这条公告？")) {
                              deleteAnnMutation.mutate({ id: ann.id });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Coins tab ──────────────────────────────────────────────────────── */}
        {activeTab === "coins" && isOwner && (
          <div className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Coins className="w-4 h-4 text-yellow-500" />
                  向居民发放金币（¥1 = 10 金币）
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">选择居民</label>
                  <Select
                    value={coinUserId?.toString() ?? ""}
                    onValueChange={(v) => setCoinUserId(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择要发放金币的居民..." />
                    </SelectTrigger>
                    <SelectContent>
                      {plazaUsers?.map((u) => (
                        <SelectItem key={u.id} value={u.id.toString()}>
                          {u.id === user?.id ? "⭐ " : ""}{u.displayName || u.username || u.name || "未命名"}{u.id === user?.id ? "（我自己）" : ""} — 🪙 {u.coins ?? 0}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">金币数量</label>
                    <Input
                      type="number"
                      value={coinAmount}
                      onChange={(e) => setCoinAmount(e.target.value)}
                      placeholder="例如：100"
                      min={1}
                      max={99999}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">备注（可选）</label>
                    <Input
                      value={coinNote}
                      onChange={(e) => setCoinNote(e.target.value)}
                      placeholder="例如：3月稿费奖励"
                      maxLength={200}
                    />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                  💡 兑换比例：<strong>¥1 = 🪙10 金币</strong>，发放后对方在广场页面实时收到金币通知
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[10, 50, 100, 300, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setCoinAmount(amt.toString())}
                      className="px-3 py-1.5 text-xs rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200 transition-colors"
                    >
                      🪙{amt}
                    </button>
                  ))}
                </div>
                <Button
                  onClick={() => {
                    if (!coinUserId) { toast.error("请选择居民"); return; }
                    const amount = parseInt(coinAmount);
                    if (!amount || amount < 1) { toast.error("请输入有效金币数量"); return; }
                    grantCoinsMutation.mutate({ recipientId: coinUserId, amount, note: coinNote || undefined });
                  }}
                  disabled={grantCoinsMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {grantCoinsMutation.isPending ? "发放中..." : "🪙 发放金币"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">金币发放记录</CardTitle>
              </CardHeader>
              <CardContent>
                {!coinHistory || coinHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">暂无记录</p>
                ) : (
                  <div className="space-y-2">
                    {coinHistory.slice(0, 20).map((record: any) => (
                      <div key={record.id} className="flex items-center gap-3 p-2.5 bg-muted/30 rounded-lg">
                        <span className="text-yellow-500 font-bold text-sm">🪙 +{record.amount}</span>
                        <span className="text-sm flex-1">{record.recipientName || "未知用户"}</span>
                        {record.note && (
                          <span className="text-xs text-muted-foreground">{record.note}</span>
                        )}
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {new Date(record.createdAt).toLocaleDateString("zh-CN")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Users tab ──────────────────────────────────────────────────────── */}
        {activeTab === "users" && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                居民列表 ({plazaUsers?.length ?? 0} 人)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!plazaUsers || plazaUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">暂无居民</p>
              ) : (
                <div className="space-y-2">
                  {plazaUsers.map((u) => (
                    <div key={u.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {(u.displayName || u.name || u.username || "U").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {u.displayName || u.name || u.username || "未命名"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          🪙 {u.coins ?? 0} 金币 · 加入于 {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                        </p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full flex-shrink-0 ${ROLE_COLORS[u.role ?? "user"]}`}>
                        {ROLE_LABELS[u.role ?? "user"]}
                      </span>
                      {isOwner && u.id !== user?.id && (
                        <Select
                          value={u.role ?? "user"}
                          onValueChange={(v) => {
                            if (confirm(`确定将 ${u.displayName || u.username} 的角色改为「${ROLE_LABELS[v]}」？`)) {
                              updateRoleMutation.mutate({ userId: u.id, role: v as any });
                            }
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs w-24 border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">管理员</SelectItem>
                            <SelectItem value="assistant">助理</SelectItem>
                            <SelectItem value="user">普通用户</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Payment QR tab ─────────────────────────────────────────────────── */}
        {activeTab === "payment" && isOwner && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                收款码管理（显示在广场打赏区）
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {paymentCodes && paymentCodes.length > 0 && (
                <div className="flex gap-4 flex-wrap p-3 bg-muted/30 rounded-xl">
                  <p className="text-xs text-muted-foreground w-full">当前收款码：</p>
                  {paymentCodes.map((code: any) => (
                    <div key={code.id} className="text-center">
                      <img
                        src={code.imageUrl}
                        alt={code.platform}
                        className="w-24 h-24 object-contain rounded-xl border border-border mx-auto mb-1"
                      />
                      <p className="text-xs text-muted-foreground">
                        {code.platform === "wechat" ? "微信" : "支付宝"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">支付平台</label>
                  <Select value={qrPlatform} onValueChange={(v) => setQrPlatform(v as "wechat" | "alipay")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wechat">微信支付</SelectItem>
                      <SelectItem value="alipay">支付宝</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">感谢语（可选）</label>
                  <Input
                    value={qrThankMsg}
                    onChange={(e) => setQrThankMsg(e.target.value)}
                    placeholder="例如：谢谢你的支持！"
                    maxLength={300}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  收款码图片 URL（上传到图床后粘贴链接）
                </label>
                <Input
                  value={qrImageUrl}
                  onChange={(e) => setQrImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <Button
                onClick={() => {
                  if (!qrImageUrl.trim()) { toast.error("请输入图片链接"); return; }
                  upsertQRMutation.mutate({ platform: qrPlatform, imageUrl: qrImageUrl, thankMessage: qrThankMsg || undefined });
                }}
                disabled={upsertQRMutation.isPending}
              >
                {upsertQRMutation.isPending ? "保存中..." : "💾 保存收款码"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
