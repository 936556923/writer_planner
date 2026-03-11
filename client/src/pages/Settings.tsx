import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { today } from "@/lib/utils";
import { Settings as SettingsIcon, Target, Users, Key, UserPlus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const todayStr = today();

  // Config
  const { data: config } = trpc.settings.getConfig.useQuery({});
  const [wordsPerHour, setWordsPerHour] = useState(1500);
  const [workHoursPerDay, setWorkHoursPerDay] = useState(8);
  const [deepseekKey, setDeepseekKey] = useState("");

  useEffect(() => {
    if (config) {
      setWordsPerHour(config.wordsPerHour ?? 1500);
      setWorkHoursPerDay(config.workHoursPerDay ?? 8);
    }
  }, [config]);

  const updateConfigMutation = trpc.settings.updateConfig.useMutation({
    onSuccess: () => { utils.settings.getConfig.invalidate(); toast.success("设置已保存"); },
    onError: (e) => toast.error(e.message),
  });

  // Daily goal
  const { data: dailyGoal } = trpc.settings.getDailyGoal.useQuery({ date: todayStr });
  const [targetWords, setTargetWords] = useState(0);
  const [targetOrders, setTargetOrders] = useState(0);
  const [actualWords, setActualWords] = useState(0);
  const [actualOrders, setActualOrders] = useState(0);
  const [goalNote, setGoalNote] = useState("");

  useEffect(() => {
    if (dailyGoal) {
      setTargetWords(dailyGoal.targetWords ?? 0);
      setTargetOrders(dailyGoal.targetOrders ?? 0);
      setActualWords(dailyGoal.actualWords ?? 0);
      setActualOrders(dailyGoal.actualOrders ?? 0);
      setGoalNote(dailyGoal.note ?? "");
    }
  }, [dailyGoal]);

  const upsertGoalMutation = trpc.settings.upsertDailyGoal.useMutation({
    onSuccess: () => { utils.settings.getDailyGoal.invalidate(); toast.success("今日目标已保存"); },
    onError: (e) => toast.error(e.message),
  });

  // Authorizations (admin only)
  const { data: authData } = trpc.settings.getMyAuthorizations.useQuery();
  const [assistantEmail, setAssistantEmail] = useState("");
  const { data: allUsers } = trpc.settings.listUsers.useQuery(undefined, { enabled: user?.role === "admin" || user?.role === "owner" });

  const grantMutation = trpc.settings.grantAssistant.useMutation({
    onSuccess: () => { utils.settings.getMyAuthorizations.invalidate(); setAssistantEmail(""); toast.success("已授权助理"); },
    onError: (e) => toast.error(e.message),
  });
  const revokeMutation = trpc.settings.revokeAssistant.useMutation({
    onSuccess: () => { utils.settings.getMyAuthorizations.invalidate(); toast.success("已撤销授权"); },
    onError: (e) => toast.error(e.message),
  });

  function grantByEmail() {
    const found = allUsers?.find((u) => u.email === assistantEmail || u.name === assistantEmail);
    if (!found) {
      toast.error("未找到该用户，请确认邮箱或用户名");
      return;
    }
    grantMutation.mutate({ assistantId: found.id });
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-primary" />
            设置
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">管理您的个人配置和工作目标</p>
        </div>

        {/* Daily Goal */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              今日目标（{todayStr}）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">目标字数</Label>
                <Input type="number" value={targetWords || ""} onChange={(e) => setTargetWords(parseInt(e.target.value) || 0)} placeholder="如：3000" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">目标订单数</Label>
                <Input type="number" value={targetOrders || ""} onChange={(e) => setTargetOrders(parseInt(e.target.value) || 0)} placeholder="如：2" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">实际完成字数</Label>
                <Input type="number" value={actualWords || ""} onChange={(e) => setActualWords(parseInt(e.target.value) || 0)} placeholder="0" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">实际完成订单数</Label>
                <Input type="number" value={actualOrders || ""} onChange={(e) => setActualOrders(parseInt(e.target.value) || 0)} placeholder="0" className="h-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">今日备注</Label>
              <Textarea
                value={goalNote}
                onChange={(e) => setGoalNote(e.target.value)}
                placeholder="今天的计划或注意事项..."
                className="min-h-16 text-sm resize-none"
              />
            </div>
            <Button
              onClick={() => upsertGoalMutation.mutate({ date: todayStr, targetWords, targetOrders, actualWords, actualOrders, note: goalNote })}
              disabled={upsertGoalMutation.isPending}
              className="w-full"
            >
              保存今日目标
            </Button>
          </CardContent>
        </Card>

        {/* Work config */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-primary" />
              工作配置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">每小时写字数</Label>
                <Input type="number" value={wordsPerHour} onChange={(e) => setWordsPerHour(parseInt(e.target.value) || 1500)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">每天工作小时数</Label>
                <Input type="number" value={workHoursPerDay} onChange={(e) => setWorkHoursPerDay(parseInt(e.target.value) || 8)} className="h-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <Key className="w-3.5 h-3.5" />
                DeepSeek API Key（可选，留空使用系统默认）
              </Label>
              <Input
                type="password"
                value={deepseekKey}
                onChange={(e) => setDeepseekKey(e.target.value)}
                placeholder={config?.hasDeepseekKey ? "已设置（输入新值以更新）" : "sk-..."}
                className="h-9"
              />
            </div>
            <Button
              onClick={() => updateConfigMutation.mutate({ wordsPerHour, workHoursPerDay, deepseekKey: deepseekKey || undefined })}
              disabled={updateConfigMutation.isPending}
              className="w-full"
            >
              保存配置
            </Button>
          </CardContent>
        </Card>

        {/* Authorization (admin only) */}
        {(user?.role === "admin" || user?.role === "owner") && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                助理授权管理
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                授权后，助理可以查看和编辑您的订单数据，实现双人协作同步
              </p>

              {/* Current authorizations */}
              {authData?.type === "admin" && authData.authorizations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">已授权助理</p>
                  {authData.authorizations.map((auth) => (
                    <div key={auth.id} className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{auth.assistantName || auth.assistantEmail || `用户 #${auth.assistantId}`}</p>
                        <p className="text-xs text-muted-foreground">{auth.assistantEmail || ""}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => revokeMutation.mutate({ assistantId: auth.assistantId })}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Grant new assistant */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">添加新助理</p>
                <div className="flex gap-2">
                  <Input
                    value={assistantEmail}
                    onChange={(e) => setAssistantEmail(e.target.value)}
                    placeholder="输入助理的邮箱或用户名"
                    className="h-9 flex-1"
                    list="user-list"
                  />
                  <datalist id="user-list">
                    {allUsers?.filter((u) => u.role !== "admin" && u.role !== "owner").map((u) => (
                      <option key={u.id} value={u.email || u.name || ""} />
                    ))}
                  </datalist>
                  <Button
                    onClick={grantByEmail}
                    disabled={!assistantEmail.trim() || grantMutation.isPending}
                    className="gap-1 h-9"
                  >
                    <UserPlus className="w-4 h-4" />
                    授权
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  提示：助理需要先登录系统注册账号后，才能在此处搜索到
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assistant: show authorized admins */}
        {user?.role === "assistant" && authData?.type === "assistant" && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                我的授权管理员
              </CardTitle>
            </CardHeader>
            <CardContent>
              {authData.authorizations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">暂无授权，请联系管理员授权</p>
              ) : (
                <div className="space-y-2">
                  {authData.authorizations.map((auth) => (
                    <div key={auth.id} className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{(auth as any).adminName || `管理员 #${(auth as any).adminId}`}</p>
                        <p className="text-xs text-muted-foreground">{(auth as any).adminEmail || ""}</p>
                      </div>
                      <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">已授权</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
