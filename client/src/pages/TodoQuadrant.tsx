import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import {
  Target, Plus, Bot, CheckCircle2, Circle, Trash2, Sparkles,
  AlertTriangle, Clock, ArrowDown, Zap, Gift, Coins,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

// ── Quadrant config ──────────────────────────────────────────────────────────
const QUADRANTS = {
  important_urgent: {
    title: "重要且紧急",
    subtitle: "立即行动",
    icon: <AlertTriangle className="w-4 h-4" />,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    headerBg: "bg-red-100",
  },
  important_not_urgent: {
    title: "重要不紧急",
    subtitle: "计划执行",
    icon: <Target className="w-4 h-4" />,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    headerBg: "bg-blue-100",
  },
  urgent_not_important: {
    title: "紧急不重要",
    subtitle: "委托他人",
    icon: <Clock className="w-4 h-4" />,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    headerBg: "bg-amber-100",
  },
  neither: {
    title: "不重要不紧急",
    subtitle: "暂时搁置",
    icon: <ArrowDown className="w-4 h-4" />,
    color: "text-slate-500",
    bg: "bg-slate-50",
    border: "border-slate-200",
    headerBg: "bg-slate-100",
  },
} as const;

type QuadrantKey = keyof typeof QUADRANTS;

// ── Reward animation component ───────────────────────────────────────────────
function RewardPopup({ reward, onClose }: { reward: any; onClose: () => void }) {
  if (!reward) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-sm mx-4 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        <div className="text-5xl mb-4 animate-bounce">
          {reward.drop ? (
            reward.drop.type === "pet_egg" ? "🥚" : reward.drop.type === "equipment" ? "⚔️" : "🧪"
          ) : "🪙"}
        </div>
        <h3 className="text-xl font-bold mb-2">
          {reward.drop ? "恭喜获得稀有掉落！" : "任务完成！"}
        </h3>
        <div className="space-y-2">
          <p className="flex items-center justify-center gap-2 text-amber-600 font-semibold">
            <Coins className="w-5 h-5" /> +{reward.coins} 金币
          </p>
          {reward.drop && (
            <div className={`p-3 rounded-xl ${
              reward.drop.rarity === "legendary" ? "bg-gradient-to-r from-amber-100 to-yellow-100 border-2 border-amber-300" :
              reward.drop.rarity === "epic" ? "bg-purple-50 border border-purple-200" :
              reward.drop.rarity === "rare" ? "bg-blue-50 border border-blue-200" :
              "bg-slate-50 border border-slate-200"
            }`}>
              <p className="font-bold">{reward.drop.name}</p>
              <Badge className={`mt-1 ${
                reward.drop.rarity === "legendary" ? "bg-amber-500" :
                reward.drop.rarity === "epic" ? "bg-purple-500" :
                reward.drop.rarity === "rare" ? "bg-blue-500" :
                "bg-slate-500"
              } text-white`}>
                {reward.drop.rarity === "legendary" ? "传说" :
                 reward.drop.rarity === "epic" ? "史诗" :
                 reward.drop.rarity === "rare" ? "稀有" : "普通"}
              </Badge>
            </div>
          )}
        </div>
        <Button className="mt-4 w-full" onClick={onClose}>太棒了！</Button>
      </div>
    </div>
  );
}

export default function TodoQuadrant() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [reward, setReward] = useState<any>(null);

  // Manual add
  const [newTitle, setNewTitle] = useState("");
  const [newQuadrant, setNewQuadrant] = useState<QuadrantKey>("important_urgent");

  const { data: allTodos = [], isLoading } = trpc.todoQ.list.useQuery({});
  const aiClassifyMutation = trpc.todoQ.aiClassify.useMutation();
  const createMutation = trpc.todoQ.create.useMutation();
  const toggleMutation = trpc.todoQ.toggleComplete.useMutation();
  const deleteMutation = trpc.todoQ.delete.useMutation();

  // Group by quadrant
  const todosByQuadrant = useMemo(() => {
    const map: Record<QuadrantKey, typeof allTodos> = {
      important_urgent: [],
      important_not_urgent: [],
      urgent_not_important: [],
      neither: [],
    };
    for (const t of allTodos) {
      const q = (t.quadrant as QuadrantKey) || "neither";
      if (map[q]) map[q].push(t);
    }
    return map;
  }, [allTodos]);

  const handleAiClassify = async () => {
    if (!aiText.trim()) return;
    setAiLoading(true);
    try {
      const result = await aiClassifyMutation.mutateAsync({ text: aiText });
      toast.success(`AI 已识别 ${result.todos?.length ?? 0} 个任务并自动分类！`);
      setAiText("");
      setAiDialogOpen(false);
      utils.todoQ.list.invalidate();
    } catch {
      toast.error("AI 分类失败，请重试");
    } finally {
      setAiLoading(false);
    }
  };

  const handleManualAdd = async () => {
    if (!newTitle) return;
    try {
      await createMutation.mutateAsync({ title: newTitle, quadrant: newQuadrant });
      toast.success("任务已添加！");
      setNewTitle("");
      setAddDialogOpen(false);
      utils.todoQ.list.invalidate();
    } catch {
      toast.error("添加失败");
    }
  };

  const handleToggle = async (id: number) => {
    try {
      const result = await toggleMutation.mutateAsync({ id });
      utils.todoQ.list.invalidate();
      if (result.reward) {
        setReward(result.reward);
      } else {
        toast.success("状态已更新");
      }
    } catch {
      toast.error("操作失败");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      utils.todoQ.list.invalidate();
      toast.success("已删除");
    } catch {
      toast.error("删除失败");
    }
  };

  const completedCount = allTodos.filter(t => t.isCompleted).length;
  const totalCount = allTodos.length;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Reward popup */}
        {reward && <RewardPopup reward={reward} onClose={() => setReward(null)} />}

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="w-6 h-6 text-primary" />
              四象限任务管理
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              粘贴任意文字，AI 自动识别任务并分类到四象限 | 已完成 {completedCount}/{totalCount}
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Bot className="w-4 h-4" /> AI 智能分类
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-primary" />
                    AI 智能任务分类
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    粘贴任意文字内容（会议记录、聊天内容、想法笔记等），AI 会自动提取任务并按四象限分类。
                  </p>
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
                    <p>示例："明天要交3篇稿子，下周五之前完成方案设计，记得买牛奶，有空看看新出的电影"</p>
                  </div>
                  <Textarea
                    placeholder="粘贴您的文字内容..."
                    value={aiText}
                    onChange={e => setAiText(e.target.value)}
                    className="h-40 resize-none"
                  />
                  <Button onClick={handleAiClassify} disabled={!aiText.trim() || aiLoading} className="w-full gap-2">
                    <Sparkles className="w-4 h-4" />
                    {aiLoading ? "AI 正在分析中..." : "开始分析并分类"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" /> 手动添加
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>添加任务</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="任务标题" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(QUADRANTS) as [QuadrantKey, typeof QUADRANTS[QuadrantKey]][]).map(([key, cfg]) => (
                      <Button
                        key={key}
                        variant={newQuadrant === key ? "default" : "outline"}
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => setNewQuadrant(key)}
                      >
                        {cfg.icon} {cfg.title}
                      </Button>
                    ))}
                  </div>
                  <Button onClick={handleManualAdd} disabled={!newTitle} className="w-full">
                    添加任务
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Four Quadrants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.entries(QUADRANTS) as [QuadrantKey, typeof QUADRANTS[QuadrantKey]][]).map(([quadrantKey, cfg]) => {
            const items = todosByQuadrant[quadrantKey];
            const pending = items.filter(t => !t.isCompleted);
            const completed = items.filter(t => t.isCompleted);

            return (
              <Card key={quadrantKey} className={`border-0 shadow-sm overflow-hidden`}>
                <CardHeader className={`pb-2 pt-4 px-5 ${cfg.headerBg}`}>
                  <CardTitle className={`text-sm font-semibold flex items-center gap-2 ${cfg.color}`}>
                    {cfg.icon}
                    {cfg.title}
                    <span className="text-xs font-normal text-muted-foreground">({cfg.subtitle})</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {pending.length} 待办
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2 min-h-[200px] max-h-[400px] overflow-y-auto">
                  {pending.length === 0 && completed.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground/50">暂无任务</p>
                    </div>
                  )}

                  {pending.map(todo => (
                    <div
                      key={todo.id}
                      className={`group flex items-start gap-2.5 p-3 rounded-xl border ${cfg.border} ${cfg.bg} transition-all hover:shadow-sm`}
                    >
                      <button className="shrink-0 mt-0.5" onClick={() => handleToggle(todo.id)}>
                        <Circle className={`w-4 h-4 ${cfg.color} hover:scale-110 transition-transform`} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{todo.title}</p>
                        {todo.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{todo.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {todo.deadline && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {todo.deadline}
                            </span>
                          )}
                          {todo.aiClassified && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1">AI</Badge>
                          )}
                          {todo.coinReward && (
                            <span className="text-xs text-amber-600 flex items-center gap-0.5">
                              <Coins className="w-3 h-3" /> {todo.coinReward}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={() => handleDelete(todo.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
                      </button>
                    </div>
                  ))}

                  {completed.length > 0 && (
                    <div className="pt-2 border-t border-dashed border-border/50">
                      <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-500" /> 已完成 ({completed.length})
                      </p>
                      {completed.map(todo => (
                        <div
                          key={todo.id}
                          className="group flex items-center gap-2.5 p-2 rounded-lg opacity-50"
                        >
                          <button className="shrink-0" onClick={() => handleToggle(todo.id)}>
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          </button>
                          <p className="text-sm line-through text-muted-foreground flex-1 truncate">{todo.title}</p>
                          <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={() => handleDelete(todo.id)}
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
