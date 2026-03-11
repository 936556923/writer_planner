import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { renderMarkdown } from "@/lib/utils";
import { Bot, Sparkles, Calendar, CalendarDays, Wand2, History, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PLAN_TYPES = [
  { value: "daily", label: "今日计划", icon: Calendar, desc: "基于当前订单生成今天的工作安排" },
  { value: "weekly", label: "本周计划", icon: CalendarDays, desc: "生成本周7天的工作规划" },
  { value: "custom", label: "自定义", icon: Wand2, desc: "根据您的自定义需求生成规划" },
];

export default function AiPlanner() {
  const utils = trpc.useUtils();
  const [planType, setPlanType] = useState<"daily" | "weekly" | "custom">("daily");
  const [customPrompt, setCustomPrompt] = useState("");
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: history, isLoading: historyLoading } = trpc.ai.history.useQuery({});

  const generateMutation = trpc.ai.plan.useMutation({
    onMutate: () => setIsGenerating(true),
    onSuccess: (data) => {
      setCurrentPlan(data.result);
      utils.ai.history.invalidate();
      toast.success("AI 规划已生成");
    },
    onError: (e) => toast.error(`生成失败：${e.message}`),
    onSettled: () => setIsGenerating(false),
  });

  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
  const { data: planDetail } = trpc.ai.getPlan.useQuery(
    { id: selectedHistoryId! },
    { enabled: selectedHistoryId !== null }
  );

  function generate() {
    if (planType === "custom" && !customPrompt.trim()) {
      toast.error("请输入自定义需求");
      return;
    }
    generateMutation.mutate({ mode: planType, customPrompt: customPrompt.trim() || undefined });
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            AI 智能规划
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">基于您的订单数据，AI 自动生成工作规划和优化建议</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left: Controls */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">生成设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {PLAN_TYPES.map((pt) => (
                    <button
                      key={pt.value}
                      onClick={() => setPlanType(pt.value as any)}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                        planType === pt.value
                          ? "border-primary bg-primary/5"
                          : "border-transparent bg-muted/40 hover:bg-muted/60"
                      }`}
                    >
                      <pt.icon className={`w-4 h-4 mt-0.5 shrink-0 ${planType === pt.value ? "text-primary" : "text-muted-foreground"}`} />
                      <div>
                        <p className={`text-sm font-medium ${planType === pt.value ? "text-primary" : ""}`}>{pt.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{pt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {planType === "custom" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">自定义需求</label>
                    <Textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="例如：帮我分析哪些订单需要优先处理，并给出时间分配建议..."
                      className="min-h-24 text-sm resize-none"
                    />
                  </div>
                )}

                <Button
                  onClick={generate}
                  disabled={isGenerating}
                  className="w-full gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {isGenerating ? "AI 生成中..." : "生成规划"}
                </Button>
              </CardContent>
            </Card>

            {/* History */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <History className="w-4 h-4" />
                  历史规划
                </CardTitle>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <p className="text-xs text-muted-foreground text-center py-4">加载中...</p>
                ) : !history || history.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">暂无历史记录</p>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {history.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer group"
                        onClick={() => setSelectedHistoryId(h.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {(h as any).mode === "daily" ? "今日计划" : (h as any).mode === "weekly" ? "本周计划" : "自定义"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date((h as any).createdAt).toLocaleDateString("zh-CN")}
                          </p>
                        </div>
                        <button
                          onClick={(ev) => { ev.stopPropagation(); setSelectedHistoryId(null); }}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Result */}
          <div className="lg:col-span-3">
            <Card className="border-0 shadow-sm h-full min-h-96">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  规划结果
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
                      <Bot className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">AI 正在分析您的订单数据，生成规划中...</p>
                  </div>
                ) : currentPlan ? (
                  <div
                    className="markdown-content text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(currentPlan) }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">选择规划类型并点击生成</p>
                      <p className="text-xs text-muted-foreground mt-1">AI 将根据您的订单数据生成个性化工作规划</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
