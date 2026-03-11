import { cn, getStatusConfig, getWritingStatusConfig, getSubmissionStatusConfig, getSettleStatusConfig } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, className, size = "md" }: StatusBadgeProps) {
  const cfg = getStatusConfig(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        cfg.bg,
        cfg.color,
        cfg.border,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {status}
    </span>
  );
}

// 写作状态 Badge
export function WritingStatusBadge({ status, className, size = "md" }: StatusBadgeProps) {
  const cfg = getWritingStatusConfig(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        cfg.bg,
        cfg.color,
        cfg.border,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {status}
    </span>
  );
}

// 提交状态 Badge
export function SubmissionStatusBadge({ status, className, size = "md" }: StatusBadgeProps) {
  const cfg = getSubmissionStatusConfig(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        cfg.bg,
        cfg.color,
        cfg.border,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {status}
    </span>
  );
}

// 结算状态 Badge
export function SettleStatusBadge({ status, className, size = "md" }: StatusBadgeProps) {
  const cfg = getSettleStatusConfig(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        cfg.bg,
        cfg.color,
        cfg.border,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {status}
    </span>
  );
}

// 三维度状态组合显示
export function TriStatusBadges({ writingStatus, submissionStatus, settleStatus, size = "sm" }: {
  writingStatus: string;
  submissionStatus: string;
  settleStatus: string;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex flex-wrap gap-1">
      <WritingStatusBadge status={writingStatus} size={size} />
      <SubmissionStatusBadge status={submissionStatus} size={size} />
      <SettleStatusBadge status={settleStatus} size={size} />
    </div>
  );
}
