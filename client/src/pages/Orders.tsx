import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { StatusBadge, WritingStatusBadge, SubmissionStatusBadge, SettleStatusBadge, TriStatusBadges } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  formatAmount, formatDate, formatRelativeDate, daysUntil, ORDER_STATUSES, today,
  WRITING_STATUSES, SUBMISSION_STATUSES, SETTLE_STATUSES,
} from "@/lib/utils";
import {
  Plus, Search, Trash2, Edit2, MessageSquare, ChevronRight, ChevronDown,
  AlertTriangle, Clock, Star, StickyNote, X, Check, Filter, DollarSign, FileText, Package
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";

type Order = {
  id: number; orderId: string; orderNo: string; clientService: string; designer: string;
  amount: string; settleDate: string; deadline: string; title: string; wordCount: number;
  status: string; settleStatus: string; writingStatus: string; submissionStatus: string; progressStatus: string; priority: number;
  tags: string; estimatedHours: number; actualHours: number; completedAt: string;
  settleFeedback?: string;
  createdAt: Date; updatedAt: Date;
  notes: { id: number; content: string; type: string; createdAt: Date }[];
};

const EMPTY_FORM = {
  orderId: "", orderNo: "", clientService: "", designer: "", amount: "",
  settleDate: "", deadline: "", title: "", wordCount: 0, status: "待开始" as const,
  settleStatus: "未结算" as const, writingStatus: "待开始" as const, submissionStatus: "未提交" as const,
  settleFeedback: "",
  progressStatus: "", priority: 0, tags: "",
  estimatedHours: 0, actualHours: 0,
};

// 筛选维度
type FilterDimension = "status" | "writing" | "submission" | "settle";

export default function Orders() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [writingFilter, setWritingFilter] = useState("all");
  const [submissionFilter, setSubmissionFilter] = useState("all");
  const [settleFilter, setSettleFilter] = useState("all");
  const [filterDimension, setFilterDimension] = useState<FilterDimension>("writing");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [noteInput, setNoteInput] = useState("");
  const [noteType, setNoteType] = useState<"normal" | "important">("normal");

  const { data: ordersData, isLoading } = trpc.orders.list.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    sortBy: "createdAt",
    sortDir: "DESC",
    pageSize: 500,
  });
  const { data: meta } = trpc.orders.meta.useQuery({});

  // 前端多维度筛选
  const orders = useMemo(() => {
    let list = ordersData?.orders ?? [];
    if (writingFilter !== "all") {
      list = list.filter((o) => o.writingStatus === writingFilter);
    }
    if (submissionFilter !== "all") {
      list = list.filter((o) => o.submissionStatus === submissionFilter);
    }
    if (settleFilter !== "all") {
      list = list.filter((o) => o.settleStatus === settleFilter);
    }
    return list;
  }, [ordersData?.orders, writingFilter, submissionFilter, settleFilter]);

  const createMutation = trpc.orders.create.useMutation({
    onSuccess: () => { utils.orders.list.invalidate(); utils.stats.get.invalidate(); toast.success("订单已创建"); setShowForm(false); setForm(EMPTY_FORM); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateMutation = trpc.orders.update.useMutation({
    onSuccess: () => { utils.orders.list.invalidate(); utils.stats.get.invalidate(); toast.success("订单已更新"); setEditingOrder(null); setShowForm(false); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = trpc.orders.delete.useMutation({
    onSuccess: () => { utils.orders.list.invalidate(); utils.stats.get.invalidate(); toast.success("已删除"); },
    onError: (e: any) => toast.error(e.message),
  });
  const batchDeleteMutation = trpc.orders.batchDelete.useMutation({
    onSuccess: (d: any) => { utils.orders.list.invalidate(); utils.stats.get.invalidate(); setSelectedIds(new Set()); toast.success(`已删除 ${d.deleted} 个订单`); },
    onError: (e: any) => toast.error(e.message),
  });
  const batchStatusMutation = trpc.orders.batchUpdateStatus.useMutation({
    onSuccess: (d: any) => { utils.orders.list.invalidate(); utils.stats.get.invalidate(); setSelectedIds(new Set()); toast.success(`已更新 ${d.updated} 个订单状态`); },
    onError: (e: any) => toast.error(e.message),
  });
  const addNoteMutation = trpc.orders.addNote.useMutation({
    onSuccess: () => { utils.orders.list.invalidate(); setNoteInput(""); toast.success("备注已添加"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteNoteMutation = trpc.orders.deleteNote.useMutation({
    onSuccess: () => { utils.orders.list.invalidate(); toast.success("备注已删除"); },
  });

  function openCreate() {
    setEditingOrder(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(order: Order) {
    setEditingOrder(order);
    setForm({
      orderId: order.orderId ?? "",
      orderNo: order.orderNo ?? "",
      clientService: order.clientService ?? "",
      designer: order.designer ?? "",
      amount: order.amount ?? "",
      settleDate: order.settleDate ?? "",
      deadline: order.deadline ?? "",
      title: order.title ?? "",
      wordCount: order.wordCount ?? 0,
      status: (order.status as typeof EMPTY_FORM.status) ?? "待开始",
      settleStatus: (order.settleStatus as typeof EMPTY_FORM.settleStatus) ?? "未结算",
      writingStatus: (order.writingStatus as typeof EMPTY_FORM.writingStatus) ?? "待开始",
      submissionStatus: (order.submissionStatus as typeof EMPTY_FORM.submissionStatus) ?? "未提交",
      settleFeedback: (order as any).settleFeedback ?? "",
      progressStatus: order.progressStatus ?? "",
      priority: order.priority ?? 0,
      tags: order.tags ?? "",
      estimatedHours: order.estimatedHours ?? 0,
      actualHours: order.actualHours ?? 0,
    });
    setShowForm(true);
  }

  function submitForm() {
    if (editingOrder) {
      updateMutation.mutate({ id: editingOrder.id, ...form } as any);
    } else {
      createMutation.mutate(form as any);
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o) => o.id)));
    }
  }

  // 各维度计数
  const statusCounts = useMemo(() => {
    const allOrders = ordersData?.orders ?? [];
    const counts: Record<string, number> = { all: allOrders.length };
    const wCounts: Record<string, number> = { all: allOrders.length };
    const sCounts: Record<string, number> = { all: allOrders.length };
    const settleCounts: Record<string, number> = { all: allOrders.length };
    for (const o of allOrders) {
      counts[o.status] = (counts[o.status] ?? 0) + 1;
      wCounts[o.writingStatus] = (wCounts[o.writingStatus] ?? 0) + 1;
      sCounts[o.submissionStatus] = (sCounts[o.submissionStatus] ?? 0) + 1;
      settleCounts[o.settleStatus] = (settleCounts[o.settleStatus] ?? 0) + 1;
    }
    return { status: counts, writing: wCounts, submission: sCounts, settle: settleCounts };
  }, [ordersData?.orders]);

  // 当前维度的筛选选项
  const filterOptions = useMemo(() => {
    switch (filterDimension) {
      case "writing":
        return { items: ["all", "待开始", "进行中", "修改中", "已完成", "初稿待提交", "修改"], counts: statusCounts.writing, current: writingFilter, setter: setWritingFilter };
      case "submission":
        return { items: ["all", "未提交", "收货待提交", "待提交", "已提交"], counts: statusCounts.submission, current: submissionFilter, setter: setSubmissionFilter };
      case "settle":
        return { items: ["all", "未结算", "待结算", "异常核实中", "已结算"], counts: statusCounts.settle, current: settleFilter, setter: setSettleFilter };
      default:
        return { items: ["all", ...ORDER_STATUSES], counts: statusCounts.status, current: statusFilter, setter: setStatusFilter };
    }
  }, [filterDimension, statusCounts, statusFilter, writingFilter, submissionFilter, settleFilter]);

  function resetFilters() {
    setStatusFilter("all");
    setWritingFilter("all");
    setSubmissionFilter("all");
    setSettleFilter("all");
  }

  const hasActiveFilter = writingFilter !== "all" || submissionFilter !== "all" || settleFilter !== "all" || statusFilter !== "all";

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4 max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">订单管理</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              共 {ordersData?.total ?? 0} 个订单
              {hasActiveFilter && <span className="text-primary ml-1">（筛选后 {orders.length} 个）</span>}
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            新建订单
          </Button>
        </div>

        {/* Search + Dimension Tabs */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索订单ID、客服、设计师..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          {/* 维度切换 */}
          <div className="flex bg-muted/50 rounded-lg p-0.5 gap-0.5">
            {([
              { key: "writing" as const, label: "写作", icon: <FileText className="w-3 h-3" /> },
              { key: "submission" as const, label: "提交", icon: <Package className="w-3 h-3" /> },
              { key: "settle" as const, label: "结算", icon: <DollarSign className="w-3 h-3" /> },
              { key: "status" as const, label: "综合", icon: <Filter className="w-3 h-3" /> },
            ]).map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setFilterDimension(key)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  filterDimension === key
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {icon}{label}
              </button>
            ))}
          </div>
          {hasActiveFilter && (
            <button onClick={resetFilters} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
              <X className="w-3 h-3" /> 清除筛选
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex gap-1.5 flex-wrap">
          {filterOptions.items.map((s) => (
            <button
              key={s}
              onClick={() => filterOptions.setter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterOptions.current === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {s === "all" ? "全部" : s}
              {filterOptions.counts[s] !== undefined && (
                <span className="ml-1 opacity-70">{filterOptions.counts[s]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Batch actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
            <span className="text-sm font-medium text-primary">已选 {selectedIds.size} 个</span>
            <div className="flex gap-2 ml-auto">
              <Select onValueChange={(v) => {
                if (v) batchStatusMutation.mutate({ ids: Array.from(selectedIds), status: v as any });
              }}>
                <SelectTrigger className="h-8 text-xs w-36">
                  <SelectValue placeholder="批量改状态" />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="destructive"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  if (confirm(`确定删除 ${selectedIds.size} 个订单？`)) {
                    batchDeleteMutation.mutate({ ids: Array.from(selectedIds) });
                  }
                }}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                批量删除
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSelectedIds(new Set())}>
                取消
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="w-10 p-3">
                    <Checkbox
                      checked={selectedIds.size === orders.length && orders.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">订单信息</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">客服/设计师</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">金额</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">截止时间</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">三维状态</th>
                  <th className="text-right p-3 font-medium text-muted-foreground text-xs">操作</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">加载中...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">暂无订单</td></tr>
                ) : (
                  orders.map((order) => {
                    const days = daysUntil(order.deadline);
                    const isOverdue = days !== null && days < 0 && order.status !== "已完成" && order.status !== "已结算";
                    const isUrgent = days !== null && days >= 0 && days <= 3 && order.status !== "已完成" && order.status !== "已结算";
                    const isExpanded = expandedId === order.id;
                    const hasSettleIssue = order.settleStatus === "异常核实中";
                    return (
                      <>
                        <tr
                          key={order.id}
                          className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${
                            hasSettleIssue ? "bg-red-50/40" : isOverdue ? "bg-red-50/30" : isUrgent ? "bg-amber-50/30" : ""
                          }`}
                        >
                          <td className="p-3">
                            <Checkbox
                              checked={selectedIds.has(order.id)}
                              onCheckedChange={() => toggleSelect(order.id)}
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : order.id)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                              <div>
                                <p className="font-medium truncate max-w-48">
                                  {order.title || order.orderId || order.orderNo || `#${order.id}`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {order.orderId || order.orderNo || "—"}
                                  {order.wordCount ? ` · ${order.wordCount}字` : ""}
                                </p>
                              </div>
                              {(order.priority ?? 0) > 0 && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                              {order.notes?.length > 0 && (
                                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                  <StickyNote className="w-3 h-3" />{order.notes.length}
                                </span>
                              )}
                              {hasSettleIssue && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                            </div>
                          </td>
                          <td className="p-3">
                            <p className="text-sm">{order.clientService || "—"}</p>
                            <p className="text-xs text-muted-foreground">{order.designer || "—"}</p>
                          </td>
                          <td className="p-3 font-medium">{formatAmount(order.amount)}</td>
                          <td className="p-3">
                            <p className="text-sm">{formatDate(order.deadline) || "—"}</p>
                            <p className={`text-xs ${
                              (order.settleStatus === "已结算" || order.status === "已结算" || order.status === "已完成")
                                ? "text-green-500 font-medium"
                                : isOverdue ? "text-red-500 font-medium"
                                : isUrgent ? "text-amber-500 font-medium"
                                : "text-muted-foreground"
                            }`}>
                              {(order.settleStatus === "已结算" || order.status === "已结算")
                                ? (order.settleDate ? `结算 ${order.settleDate.substring(0, 10)}` : "✓ 已结算")
                                : order.status === "已完成" ? "✓ 已完成"
                                : formatRelativeDate(order.deadline)}
                            </p>
                          </td>
                          <td className="p-3">
                            <TriStatusBadges
                              writingStatus={order.writingStatus}
                              submissionStatus={order.submissionStatus}
                              settleStatus={order.settleStatus}
                              size="sm"
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1 justify-end">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(order as any)}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={() => { if (confirm("确定删除此订单？")) deleteMutation.mutate({ id: order.id }); }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${order.id}-expanded`} className="bg-muted/10 border-b">
                            <td colSpan={7} className="px-6 py-4">
                              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="space-y-2">
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">订单详情</h4>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                    <span className="text-muted-foreground">写作状态</span>
                                    <span><WritingStatusBadge status={order.writingStatus} size="sm" /></span>
                                    <span className="text-muted-foreground">提交状态</span>
                                    <span><SubmissionStatusBadge status={order.submissionStatus} size="sm" /></span>
                                    <span className="text-muted-foreground">结算状态</span>
                                    <span><SettleStatusBadge status={order.settleStatus} size="sm" /></span>
                                    {order.settleDate && <><span className="text-muted-foreground">结算日期</span><span>{order.settleDate}</span></>}
                                    {(order as any).settleFeedback && (
                                      <>
                                        <span className="text-muted-foreground">结算反馈</span>
                                        <span className="text-red-600 text-xs">{(order as any).settleFeedback}</span>
                                      </>
                                    )}
                                    {order.tags && <><span className="text-muted-foreground">标签</span><span>{order.tags}</span></>}
                                    {order.completedAt && <><span className="text-muted-foreground">完成时间</span><span>{order.completedAt}</span></>}
                                  </div>
                                </div>
                                <div className="space-y-2 lg:col-span-2">
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                    <MessageSquare className="w-3.5 h-3.5" /> 备注
                                  </h4>
                                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                    {order.notes?.map((note) => (
                                      <div key={note.id} className={`flex items-start gap-2 p-2 rounded-lg text-xs ${note.type === "important" ? "bg-amber-50 border border-amber-200" : "bg-muted/50"}`}>
                                        {note.type === "important" && <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0 mt-0.5" />}
                                        <span className="flex-1">{note.content}</span>
                                        <button
                                          onClick={() => deleteNoteMutation.mutate({ id: note.id })}
                                          className="text-muted-foreground hover:text-destructive shrink-0"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex gap-2 mt-2">
                                    <Input
                                      placeholder="添加备注..."
                                      value={noteInput}
                                      onChange={(e) => setNoteInput(e.target.value)}
                                      className="h-7 text-xs"
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && noteInput.trim()) {
                                          addNoteMutation.mutate({ orderId: order.id, content: noteInput.trim(), type: noteType });
                                        }
                                      }}
                                    />
                                    <Select value={noteType} onValueChange={(v) => setNoteType(v as any)}>
                                      <SelectTrigger className="h-7 w-20 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="normal">普通</SelectItem>
                                        <SelectItem value="important">重要</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      size="sm"
                                      className="h-7 text-xs px-3"
                                      disabled={!noteInput.trim()}
                                      onClick={() => addNoteMutation.mutate({ orderId: order.id, content: noteInput.trim(), type: noteType })}
                                    >
                                      <Check className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Order Form Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditingOrder(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOrder ? "编辑订单" : "新建订单"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">订单ID</Label>
                <Input value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })} placeholder="如：ORD-2024-001" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">订单编号</Label>
                <Input value={form.orderNo} onChange={(e) => setForm({ ...form, orderNo: e.target.value })} placeholder="内部编号" className="h-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">标题</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="文章标题" className="h-9" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">派单客服</Label>
                <Input value={form.clientService} onChange={(e) => setForm({ ...form, clientService: e.target.value })} placeholder="客服名称" className="h-9" list="cs-list" />
                <datalist id="cs-list">{meta?.clientServices?.map((cs) => <option key={cs} value={cs} />)}</datalist>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">接单设计师</Label>
                <Input value={form.designer} onChange={(e) => setForm({ ...form, designer: e.target.value })} placeholder="设计师花名" className="h-9" list="designer-list" />
                <datalist id="designer-list">{meta?.designers?.map((d) => <option key={d} value={d} />)}</datalist>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">金额（元）</Label>
                <Input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">字数要求</Label>
                <Input type="number" value={form.wordCount || ""} onChange={(e) => setForm({ ...form, wordCount: parseInt(e.target.value) || 0 })} placeholder="0" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">优先级</Label>
                <Input type="number" value={form.priority || ""} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} placeholder="0" min="0" max="10" className="h-9" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">截止时间</Label>
                <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">结算日期</Label>
                <Input type="date" value={form.settleDate} onChange={(e) => setForm({ ...form, settleDate: e.target.value })} className="h-9" />
              </div>
            </div>

            {/* 三维度状态选择 */}
            <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">订单状态（三维度）</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1"><FileText className="w-3 h-3" /> 写作状态</Label>
                  <Select value={form.writingStatus} onValueChange={(v) => setForm({ ...form, writingStatus: v as any })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["待开始", "进行中", "修改中", "已完成", "初稿待提交", "修改"] as const).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1"><Package className="w-3 h-3" /> 提交状态</Label>
                  <Select value={form.submissionStatus} onValueChange={(v) => setForm({ ...form, submissionStatus: v as any })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["未提交", "收货待提交", "待提交", "已提交"] as const).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1"><DollarSign className="w-3 h-3" /> 结算状态</Label>
                  <Select value={form.settleStatus} onValueChange={(v) => setForm({ ...form, settleStatus: v as any })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["未结算", "待结算", "异常核实中", "已结算"] as const).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* 结算反馈（仅在异常核实中时显示） */}
              {form.settleStatus === "异常核实中" && (
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-red-500" /> 结算反馈/异常原因</Label>
                  <Input
                    value={form.settleFeedback}
                    onChange={(e) => setForm({ ...form, settleFeedback: e.target.value })}
                    placeholder="如：订单未备注，找客服处理"
                    className="h-9 border-red-200"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">综合状态（旧）</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">标签</Label>
                <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="用逗号分隔" className="h-9" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingOrder(null); }}>取消</Button>
            <Button onClick={submitForm} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingOrder ? "保存修改" : "创建订单"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
