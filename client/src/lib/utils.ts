import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ORDER_STATUSES = ["待开始", "进行中", "待审核", "已完成", "待结算", "已结算"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  待开始: { label: "待开始", color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200", dot: "bg-slate-400" },
  进行中: { label: "进行中", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-500" },
  待审核: { label: "待审核", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500" },
  已完成: { label: "已完成", color: "text-green-700", bg: "bg-green-50", border: "border-green-200", dot: "bg-green-500" },
  待结算: { label: "待结算", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", dot: "bg-orange-500" },
  已结算: { label: "已结算", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500" },
};

// ── 三维度状态配置 ──────────────────────────────────────────────────────────────

// 写作状态（业务执行维度）
export const WRITING_STATUSES = ["待开始", "进行中", "修改中", "已完成", "初稿待提交", "修改"] as const;
export type WritingStatus = (typeof WRITING_STATUSES)[number];

export const WRITING_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; dot: string; icon: string }
> = {
  待开始: { label: "待开始", color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200", dot: "bg-slate-400", icon: "⏳" },
  进行中: { label: "进行中", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-500", icon: "✍️" },
  修改中: { label: "修改中", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500", icon: "🔄" },
  已完成: { label: "已完成", color: "text-green-700", bg: "bg-green-50", border: "border-green-200", dot: "bg-green-500", icon: "✅" },
  初稿待提交: { label: "初稿待提交", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-400", icon: "📝" },
  修改: { label: "修改", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-400", icon: "🔄" },
};

// 提交状态（交付维度）
export const SUBMISSION_STATUSES = ["未提交", "收货待提交", "待提交", "已提交"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const SUBMISSION_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; dot: string; icon: string }
> = {
  未提交: { label: "未提交", color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200", dot: "bg-slate-400", icon: "📋" },
  收货待提交: { label: "收货待提交", color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200", dot: "bg-purple-500", icon: "📦" },
  待提交: { label: "待提交", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500", icon: "📤" },
  已提交: { label: "已提交", color: "text-green-700", bg: "bg-green-50", border: "border-green-200", dot: "bg-green-500", icon: "✅" },
};

// 结算状态（财务维度）
export const SETTLE_STATUSES = ["未结算", "待结算", "异常核实中", "已结算"] as const;
export type SettleStatus = (typeof SETTLE_STATUSES)[number];

export const SETTLE_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; dot: string; icon: string }
> = {
  未结算: { label: "未结算", color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200", dot: "bg-slate-400", icon: "💰" },
  待结算: { label: "待结算", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", dot: "bg-orange-500", icon: "⏰" },
  异常核实中: { label: "异常核实中", color: "text-red-700", bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500", icon: "⚠️" },
  已结算: { label: "已结算", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500", icon: "✅" },
};

export function getStatusConfig(status: string) {
  return STATUS_CONFIG[status as OrderStatus] ?? STATUS_CONFIG["待开始"];
}

export function getWritingStatusConfig(status: string) {
  return WRITING_STATUS_CONFIG[status] ?? WRITING_STATUS_CONFIG["待开始"];
}

export function getSubmissionStatusConfig(status: string) {
  return SUBMISSION_STATUS_CONFIG[status] ?? SUBMISSION_STATUS_CONFIG["未提交"];
}

export function getSettleStatusConfig(status: string) {
  return SETTLE_STATUS_CONFIG[status] ?? SETTLE_STATUS_CONFIG["未结算"];
}

export function formatAmount(amt: string | null | undefined): string {
  if (!amt) return "—";
  const n = parseFloat(amt);
  return isNaN(n) ? amt : `¥${n.toFixed(2)}`;
}

export function formatDate(str: string | null | undefined): string {
  if (!str) return "—";
  return str.slice(0, 10);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - new Date(today()).getTime();
  return Math.ceil(diff / 86400000);
}

export function formatRelativeDate(dateStr: string | null | undefined): string {
  const days = daysUntil(dateStr);
  if (days === null) return "无截止";
  if (days < 0) return `逾期 ${Math.abs(days)} 天`;
  if (days === 0) return "今天截止";
  if (days === 1) return "明天截止";
  return `${days} 天后`;
}

export function renderMarkdown(text: string): string {
  if (!text) return "";
  let html = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^---+$/gm, "<hr>")
    .replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
  html = html.replace(/(\|.+\|\n)+/g, (tableStr) => {
    const rows = tableStr.trim().split("\n").filter((r) => r.trim());
    let result = "<table>";
    rows.forEach((row, i) => {
      if (row.match(/^\|[-\s|:]+\|$/)) return;
      const cells = row.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      const tag = i === 0 ? "th" : "td";
      result += "<tr>" + cells.map((c) => `<${tag}>${c.trim()}</${tag}>`).join("") + "</tr>";
    });
    result += "</table>";
    return result;
  });
  html = html.split("\n\n").map((p) => {
    p = p.trim();
    if (!p) return "";
    if (p.match(/^<(h[1-6]|ul|ol|li|table|blockquote|hr)/)) return p;
    return `<p>${p.replace(/\n/g, "<br>")}</p>`;
  }).join("");
  return html;
}
