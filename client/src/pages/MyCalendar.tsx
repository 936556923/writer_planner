import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Bot, CheckCircle2,
  Circle, Dumbbell, Sparkles, Coffee, Briefcase, Heart, Users, MoreHorizontal,
  Trash2,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

// ── Event type config ────────────────────────────────────────────────────────
const EVENT_TYPES: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  work: { label: "工作", icon: <Briefcase className="w-3.5 h-3.5" />, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  fitness: { label: "健身", icon: <Dumbbell className="w-3.5 h-3.5" />, color: "text-green-600", bg: "bg-green-50 border-green-200" },
  skincare: { label: "护肤", icon: <Heart className="w-3.5 h-3.5" />, color: "text-pink-600", bg: "bg-pink-50 border-pink-200" },
  meal: { label: "用餐", icon: <Coffee className="w-3.5 h-3.5" />, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  rest: { label: "休息", icon: <Sparkles className="w-3.5 h-3.5" />, color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
  social: { label: "社交", icon: <Users className="w-3.5 h-3.5" />, color: "text-cyan-600", bg: "bg-cyan-50 border-cyan-200" },
  other: { label: "其他", icon: <MoreHorizontal className="w-3.5 h-3.5" />, color: "text-slate-600", bg: "bg-slate-50 border-slate-200" },
};

function getWeekDates(baseDate: Date): string[] {
  const d = new Date(baseDate);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    dates.push(dd.toISOString().slice(0, 10));
  }
  return dates;
}

const WEEKDAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export default function MyCalendar() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  // Manual add form
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<string>("other");
  const [newDate, setNewDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [newEndTime, setNewEndTime] = useState("");

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  const todayStr = new Date().toISOString().slice(0, 10);

  // Fetch events for the week
  const { data: events = [], isLoading } = trpc.calendar.list.useQuery({
    startDate: weekDates[0],
    endDate: weekDates[6],
  });

  const aiParseMutation = trpc.calendar.aiParse.useMutation();
  const createMutation = trpc.calendar.create.useMutation();
  const toggleMutation = trpc.calendar.toggleComplete.useMutation();
  const deleteMutation = trpc.calendar.delete.useMutation();

  const navigateWeek = (dir: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d);
  };

  const handleAiParse = async () => {
    if (!aiText.trim()) return;
    setAiLoading(true);
    try {
      const result = await aiParseMutation.mutateAsync({
        text: aiText,
        weekStartDate: weekDates[0],
      });
      toast.success(`AI 已识别并创建 ${result.events?.length ?? 0} 个日程事件！`);
      setAiText("");
      setAiDialogOpen(false);
      utils.calendar.list.invalidate();
    } catch {
      toast.error("AI 解析失败，请重试");
    } finally {
      setAiLoading(false);
    }
  };

  const handleManualAdd = async () => {
    if (!newTitle || !newDate) return;
    try {
      await createMutation.mutateAsync({
        title: newTitle,
        eventType: newType as any,
        startTime: newStartTime,
        endTime: newEndTime || undefined,
        date: newDate,
      });
      toast.success("日程已添加！");
      setNewTitle("");
      setNewDate("");
      setAddDialogOpen(false);
      utils.calendar.list.invalidate();
    } catch {
      toast.error("添加失败");
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await toggleMutation.mutateAsync({ id });
      utils.calendar.list.invalidate();
      toast.success("状态已更新！");
    } catch {
      toast.error("操作失败");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      utils.calendar.list.invalidate();
      toast.success("已删除");
    } catch {
      toast.error("删除失败");
    }
  };

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map: Record<string, typeof events> = {};
    for (const d of weekDates) map[d] = [];
    for (const e of events) {
      if (map[e.date]) map[e.date].push(e);
    }
    return map;
  }, [events, weekDates]);

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-primary" />
              我的日历行程
            </h1>
            <p className="text-sm text-muted-foreground mt-1">管理您的每日行程，健身、护肤、工作一目了然</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Bot className="w-4 h-4" /> AI 智能填充
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-primary" />
                    AI 智能日程解析
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    输入您的日常计划描述，AI 会自动识别并创建日程事件。支持自然语言，例如：
                  </p>
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
                    <p>"每天早上8点吃早餐，12点午餐，6点晚餐"</p>
                    <p>"周一三五下午3点健身1小时"</p>
                    <p>"每天晚上10点护肤，工作日9点到6点工作"</p>
                  </div>
                  <Textarea
                    placeholder="描述您的日程安排..."
                    value={aiText}
                    onChange={e => setAiText(e.target.value)}
                    className="h-32 resize-none"
                  />
                  <Button onClick={handleAiParse} disabled={!aiText.trim() || aiLoading} className="w-full gap-2">
                    <Sparkles className="w-4 h-4" />
                    {aiLoading ? "AI 正在解析中..." : "开始解析并创建日程"}
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
                  <DialogTitle>添加日程</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>标题</Label>
                    <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="例如：健身" className="mt-1" />
                  </div>
                  <div>
                    <Label>类型</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {Object.entries(EVENT_TYPES).map(([key, cfg]) => (
                        <Button
                          key={key}
                          variant={newType === key ? "default" : "outline"}
                          size="sm"
                          className="gap-1"
                          onClick={() => setNewType(key)}
                        >
                          {cfg.icon} {cfg.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>日期</Label>
                      <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label>开始时间</Label>
                      <Input type="time" value={newStartTime} onChange={e => setNewStartTime(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label>结束时间</Label>
                      <Input type="time" value={newEndTime} onChange={e => setNewEndTime(e.target.value)} className="mt-1" />
                    </div>
                  </div>
                  <Button onClick={handleManualAdd} disabled={!newTitle || !newDate} className="w-full">
                    添加日程
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigateWeek(-1)}>
            <ChevronLeft className="w-4 h-4" /> 上一周
          </Button>
          <div className="text-sm font-medium">
            {weekDates[0]} ~ {weekDates[6]}
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigateWeek(1)}>
            下一周 <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Week Grid */}
        <div className="grid grid-cols-7 gap-3">
          {weekDates.map((date, idx) => {
            const isToday = date === todayStr;
            const dayEvents = eventsByDate[date] ?? [];
            return (
              <div key={date} className={`min-h-[300px] rounded-xl border p-3 transition-all ${isToday ? "border-primary bg-primary/5 shadow-sm" : "border-border"}`}>
                {/* Day header */}
                <div className="text-center mb-3">
                  <p className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                    {WEEKDAY_LABELS[idx]}
                  </p>
                  <p className={`text-lg font-bold ${isToday ? "text-primary" : ""}`}>
                    {date.slice(8)}
                  </p>
                  {isToday && <Badge className="text-[10px] h-4 px-1.5 mt-0.5">今天</Badge>}
                </div>

                {/* Events */}
                <div className="space-y-1.5">
                  {dayEvents.map(evt => {
                    const cfg = EVENT_TYPES[evt.eventType] ?? EVENT_TYPES.other;
                    return (
                      <div
                        key={evt.id}
                        className={`group relative p-2 rounded-lg border text-xs transition-all ${
                          evt.isCompleted ? "opacity-50 line-through" : cfg.bg
                        }`}
                      >
                        <div className="flex items-start gap-1.5">
                          <button
                            className="shrink-0 mt-0.5"
                            onClick={() => handleToggle(evt.id)}
                          >
                            {evt.isCompleted ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <Circle className={`w-3.5 h-3.5 ${cfg.color}`} />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${cfg.color}`}>{evt.title}</p>
                            <p className="text-muted-foreground">{evt.startTime}{evt.endTime ? `-${evt.endTime}` : ""}</p>
                          </div>
                          <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={() => handleDelete(evt.id)}
                          >
                            <Trash2 className="w-3 h-3 text-red-400 hover:text-red-600" />
                          </button>
                        </div>
                        {evt.isRecurring && (
                          <Badge variant="outline" className="text-[9px] h-3.5 px-1 mt-1">
                            {evt.cronRule || "重复"}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                  {dayEvents.length === 0 && (
                    <p className="text-center text-muted-foreground/40 text-xs py-4">暂无</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
