import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ORDER_STATUSES } from "@/lib/utils";
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";

export default function ImportExport() {
  const [exportStatus, setExportStatus] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (exportStatus !== "all") params.set("status", exportStatus);
      params.set("format", "xlsx");
      const res = await fetch(`/api/export?${params}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "导出失败" }));
        throw new Error(err.message || "导出失败");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `订单导出_${new Date().toLocaleDateString("zh-CN").replace(/\//g, "-")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("导出成功");
    } catch (e: any) {
      toast.error(e.message || "导出失败");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleImport(file: File) {
    setIsImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import-orders", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "导入失败");
      setImportResult(data);
      toast.success(`导入完成：新建 ${data.created} 个，更新 ${data.updated} 个`);
    } catch (e: any) {
      toast.error(e.message || "导入失败");
    } finally {
      setIsImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-xl font-bold tracking-tight">导入 / 导出</h1>
          <p className="text-sm text-muted-foreground mt-0.5">支持 Excel (.xlsx) 格式的批量导入和导出</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Export */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Download className="w-4 h-4 text-primary" />
                导出订单
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">将订单数据导出为 Excel 文件，可按状态筛选</p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">筛选状态</label>
                <Select value={exportStatus} onValueChange={setExportStatus}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    {ORDER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleExport} disabled={isExporting} className="w-full gap-2">
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {isExporting ? "导出中..." : "导出 Excel"}
              </Button>
            </CardContent>
          </Card>

          {/* Import */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                导入订单
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                上传 Excel 文件批量导入订单。已存在的订单（按订单ID匹配）将被更新
              </p>
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleImport(file);
                }}
              >
                {isImporting ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">导入中...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm font-medium">点击或拖拽文件到此处</p>
                    <p className="text-xs text-muted-foreground">支持 .xlsx 格式</p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImport(file);
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Import result */}
        {importResult && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">导入结果</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>新建 <strong>{importResult.created}</strong> 个订单</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  <span>更新 <strong>{importResult.updated}</strong> 个订单</span>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {importResult.errors.length} 行导入失败
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-xs text-muted-foreground bg-destructive/5 px-2 py-1 rounded">{err}</p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Field mapping guide */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Excel 字段说明</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Excel 列名</th>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">字段说明</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">备注</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    ["订单ID", "订单唯一标识", "用于匹配更新"],
                    ["订单编号", "内部编号", "可选"],
                    ["标题", "文章/项目标题", "可选"],
                    ["派单客服", "客服名称", "可选"],
                    ["接单设计师", "设计师花名", "可选"],
                    ["金额", "订单金额（数字）", "如：150.00"],
                    ["截止时间", "截止日期", "格式：2024-01-15"],
                    ["结算日期", "预计结算日期", "可选"],
                    ["字数", "字数要求（数字）", "可选"],
                    ["状态", "订单状态", "待开始/进行中/待审核/已完成/待结算/已结算"],
                    ["标签", "标签（逗号分隔）", "可选"],
                  ].map(([col, desc, note]) => (
                    <tr key={col}>
                      <td className="py-1.5 pr-4 font-medium">{col}</td>
                      <td className="py-1.5 pr-4 text-muted-foreground">{desc}</td>
                      <td className="py-1.5 text-muted-foreground">{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
