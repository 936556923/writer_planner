import type { Express, Request, Response } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { sdk } from "./_core/sdk";
import {
  getAllOrdersForUser,
  isAssistantAuthorized,
  getDb,
} from "./db";
import { orders, notes } from "../drizzle/schema";
import { and, eq } from "drizzle-orm";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const COL_MAP: Record<string, string> = {
  "日期（最终提交结算时间）": "settleDate",
  日期: "settleDate",
  结算日期: "settleDate",
  订单id: "orderId",
  订单ID: "orderId",
  订单Id: "orderId",
  "订单处理结果（驳回反馈）": "processResult",
  订单处理结果: "processResult",
  处理结果: "processResult",
  订单编号: "orderNo",
  编号: "orderNo",
  派单客服: "clientService",
  客服: "clientService",
  "接单设计师 (花名）": "designer",
  "接单设计师(花名)": "designer",
  "接单设计师（花名）": "designer",
  接单设计师: "designer",
  设计师: "designer",
  花名: "designer",
  设计师到手金额: "amount",
  金额: "amount",
  稿费: "amount",
  到手金额: "amount",
  标题: "title",
  文章标题: "title",
  字数: "wordCount",
  要求字数: "wordCount",
  字数要求: "wordCount",
  交稿时间: "deadline",
  截止时间: "deadline",
  截止日期: "deadline",
  结算形式: "settleMethod", // 新增容错，虽然数据库可能不存
  支付宝账号: "alipayAccount", // 新增容错
  支付宝实名: "alipayName", // 新增容错
  注册的手机账号: "phoneAccount", // 新增容错
};

function parseDate(val: unknown): string {
  if (!val) return "";
  const s = String(val).trim();
  const m = s.match(/(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/);
  if (m) return m[1].replace(/\//g, "-");
  if (/^\d+(\.\d+)?$/.test(s)) {
    try {
      const d = XLSX.SSF.parse_date_code(Number(s));
      return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    } catch {}
  }
  const cm = s.match(/(\d{4})年(\d{1,2})月(\d{1,2})日?/);
  if (cm) return `${cm[1]}-${cm[2].padStart(2, "0")}-${cm[3].padStart(2, "0")}`;
  return s;
}

function nowStr() {
  return new Date().toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-");
}

async function getAuthenticatedUser(req: Request) {
  try {
    return await sdk.authenticateRequest(req);
  } catch {
    return null;
  }
}

export function registerFileRoutes(app: Express) {
  // ── Excel/JSON Export ──────────────────────────────────────────────────────
  app.get("/api/export", async (req: Request, res: Response) => {
    const user = await getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: "未登录" });

    const { format = "json", status, targetUserId } = req.query as Record<string, string>;
    let userId = user.id;

    if (targetUserId && parseInt(targetUserId) !== user.id) {
      if (user.role === "assistant") {
        const authorized = await isAssistantAuthorized(user.id, parseInt(targetUserId));
        if (!authorized) return res.status(403).json({ error: "未获得授权" });
        userId = parseInt(targetUserId);
      } else {
        return res.status(403).json({ error: "无权操作他人数据" });
      }
    }

    let allOrders = await getAllOrdersForUser(userId);
    if (status && status !== "all") {
      allOrders = allOrders.filter((o) => o.status === status);
    }
    allOrders = [...allOrders].sort((a, b) =>
      (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
    );

    const todayStr = new Date().toISOString().slice(0, 10);

    if (format === "xlsx") {
      const data = allOrders.map((o) => ({
        "日期（最终提交结算时间）": o.settleDate,
        "订单ID": o.orderId,
        "订单处理结果（驳回反馈）": o.settleFeedback || (o.status === "已完成" ? "已经完稿" : o.status),
        "订单编号": o.orderNo,
        "派单客服": o.clientService,
        "接单设计师 (花名）": o.designer,
        "设计师到手金额": o.amount,
        "结算形式": "", // 数据库目前未记录此项，留空
        "支付宝账号": "", // 留空
        "支付宝实名": "", // 留空
        "注册的手机账号": "", // 留空
        "所属外部设计师": "", // 留空
        "所属项目部": "", // 留空
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "订单数据");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="orders_${todayStr}.xlsx"`
      );
      return res.send(buf);
    }

    // JSON export
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="orders_${todayStr}.json"`
    );
    return res.json(allOrders);
  });

  // ── Excel Import ───────────────────────────────────────────────────────────
  app.post(
    "/api/import-orders",
    upload.single("file"),
    async (req: Request, res: Response) => {
      const user = await getAuthenticatedUser(req);
      if (!user) return res.status(401).json({ error: "未登录" });
      if (!req.file) return res.status(400).json({ error: "未收到文件" });

      // 调试日志：查看上传文件的实际内容
      console.log("[Import Debug] 文件名:", req.file.originalname);
      console.log("[Import Debug] MIME类型:", req.file.mimetype);
      console.log("[Import Debug] 文件大小:", req.file.size, "bytes");
      console.log("[Import Debug] Buffer长度:", req.file.buffer?.length);
      const header = req.file.buffer?.slice(0, 16);
      console.log("[Import Debug] 文件头(hex):", header?.toString("hex"));
      console.log("[Import Debug] 文件头(ascii):", header?.toString("ascii"));

      const { targetUserId } = req.body as { targetUserId?: string };
      let userId = user.id;

      if (targetUserId && parseInt(targetUserId) !== user.id) {
        if (user.role === "assistant") {
          const authorized = await isAssistantAuthorized(user.id, parseInt(targetUserId));
          if (!authorized) return res.status(403).json({ error: "未获得授权" });
          userId = parseInt(targetUserId);
        } else {
          return res.status(403).json({ error: "无权操作他人数据" });
        }
      }

      let wb;
      try {
        wb = XLSX.read(req.file.buffer, { type: "buffer", cellDates: false });
      } catch (e: any) {
        console.error("[Import Error] XLSX解析失败:", e.message);
        if (e.message?.includes("Invalid HTML")) {
          return res.status(400).json({ 
            error: "文件格式不支持：您上传的可能是伪装成 Excel 的网页(HTML)格式。请先用 Office/WPS 打开该文件，然后点击「另存为」标准的 .xlsx 格式，再重新上传。" 
          });
        }
        return res.status(400).json({ error: "解析 Excel 失败，文件可能已损坏 (" + String(e.message) + ")" });
      }

      try {
        const db = await getDb();
        if (!db) return res.status(500).json({ error: "数据库不可用" });

        let totalImported = 0,
          totalSkipped = 0,
          totalDuplicate = 0;
        const sheetResults: Array<{
          sheet: string;
          imported: number;
          skipped: number;
          duplicate: number;
        }> = [];

        // Get existing order IDs for this user
        const existingRows = await db
          .select({ orderId: orders.orderId })
          .from(orders)
          .where(eq(orders.userId, userId));
        const existingOrderIds = new Set(
          existingRows.map((r) => r.orderId).filter(Boolean)
        );

        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(ws, {
            header: 1,
            defval: null,
          }) as (string | null)[][];

          if (rows.length < 2) {
            sheetResults.push({ sheet: sheetName, imported: 0, skipped: 0, duplicate: 0 });
            continue;
          }

          let headerRowIdx = 0;
          let colIndex: Record<string, number> = {};

          for (let ri = 0; ri < Math.min(5, rows.length); ri++) {
            const row = rows[ri];
            const tempIdx: Record<string, number> = {};
            for (let ci = 0; ci < row.length; ci++) {
              const h = String(row[ci] ?? "")
                .trim()
                .replace(/\s+/g, " ");
              if (COL_MAP[h]) tempIdx[COL_MAP[h]] = ci;
            }
            if (Object.keys(tempIdx).length >= 2) {
              headerRowIdx = ri;
              colIndex = tempIdx;
              break;
            }
          }

          if (Object.keys(colIndex).length === 0) {
            const skipped = rows.length - 1;
            sheetResults.push({ sheet: sheetName, imported: 0, skipped, duplicate: 0 });
            totalSkipped += skipped;
            continue;
          }

          let sheetImported = 0,
            sheetSkipped = 0,
            sheetDuplicate = 0;

          for (let ri = headerRowIdx + 1; ri < rows.length; ri++) {
            const row = rows[ri];
            if (!row || row.every((c) => c === null || c === undefined || c === "")) {
              sheetSkipped++;
              totalSkipped++;
              continue;
            }

            const get = (f: string) => {
              const ci = colIndex[f];
              return ci !== undefined ? (row[ci] ?? "") : "";
            };

            const rawOrderId = String(get("orderId")).trim();
            const rawOrderNo = String(get("orderNo")).trim();
            if (!rawOrderId && !rawOrderNo) {
              sheetSkipped++;
              totalSkipped++;
              continue;
            }

            const processResult = String(get("processResult")).trim();
            let status: (typeof orders.$inferInsert)["status"] = "待开始";
            let settleStatus = "未结算";
            let writingStatus = "待开始";
            let submissionStatus = "未提交";
            let settleFeedback = "";

            // 智能推导三维度状态
            if (
              processResult.includes("结算完成") ||
              processResult.includes("已结算")
            ) {
              // 已完成 + 已提交 + 已结算
              status = "已结算";
              settleStatus = "已结算";
              writingStatus = "已完成";
              submissionStatus = "已提交";
            } else if (processResult === "已收货") {
              // 已完成 + 收货待提交 + 未结算
              status = "已完成";
              settleStatus = "未结算";
              writingStatus = "已完成";
              submissionStatus = "收货待提交";
            } else if (
              processResult.includes("未备注") ||
              processResult.includes("找客服处理") ||
              processResult.includes("异常") ||
              processResult.includes("驳回")
            ) {
              // 已完成 + 已提交 + 异常核实中
              status = "已完成";
              settleStatus = "异常核实中";
              writingStatus = "已完成";
              submissionStatus = "已提交";
              settleFeedback = processResult;
            } else if (
              processResult.includes("已完成") ||
              processResult.includes("完成")
            ) {
              status = "已完成";
              writingStatus = "已完成";
              submissionStatus = "已提交";
              settleStatus = "待结算";
            } else if (
              processResult.includes("审核")
            ) {
              status = "待审核";
              writingStatus = "已完成";
              submissionStatus = "待提交";
            } else if (processResult === "" && rawOrderId) {
              // 无处理结果但有订单ID，可能是未完成的
              status = "进行中";
              writingStatus = "进行中";
              submissionStatus = "未提交";
              settleStatus = "未结算";
            }

            const amtRaw = get("amount");
            const amtNum = parseFloat(String(amtRaw));

            if (rawOrderId && existingOrderIds.has(rawOrderId)) {
              // Update existing order
              const updateData = {
                orderNo: rawOrderNo || undefined,
                clientService: String(get("clientService")).trim() || undefined,
                designer: String(get("designer")).trim() || undefined,
                amount: isNaN(amtNum)
                  ? String(amtRaw).trim() || undefined
                  : String(amtNum),
                settleDate: parseDate(get("settleDate")) || undefined,
                deadline: parseDate(get("deadline")) || undefined,
                title: String(get("title") || "").trim() || undefined,
                wordCount: parseInt(String(get("wordCount"))) || undefined,
                status,
                settleStatus,
                writingStatus,
                submissionStatus,
                ...(settleFeedback ? { settleFeedback } : {}),
              };
              // Remove undefined values
              const cleanUpdate = Object.fromEntries(
                Object.entries(updateData).filter(([, v]) => v !== undefined)
              );
              if (Object.keys(cleanUpdate).length > 0) {
                await db
                  .update(orders)
                  .set(cleanUpdate)
                  .where(
                    and(eq(orders.userId, userId), eq(orders.orderId, rawOrderId))
                  );
              }
              sheetDuplicate++;
              totalDuplicate++;
              continue;
            }

            // Insert new order
            await db.insert(orders).values({
              userId,
              orderId: rawOrderId,
              orderNo: rawOrderNo,
              clientService: String(get("clientService")).trim(),
              designer: String(get("designer")).trim(),
              amount: isNaN(amtNum) ? String(amtRaw).trim() : String(amtNum),
              settleDate: parseDate(get("settleDate")),
              deadline: parseDate(get("deadline")),
              title: String(get("title") || "").trim(),
              wordCount: parseInt(String(get("wordCount"))) || 0,
              status,
              settleStatus: (settleStatus || "未结算") as any,
              writingStatus: (writingStatus || "待开始") as any,
              submissionStatus: (submissionStatus || "未提交") as any,
              settleFeedback: settleFeedback || "",
              progressStatus: "",
              priority: 0,
              tags: "",
              estimatedHours: 0,
              actualHours: 0,
              completedAt: "",
            });

            if (rawOrderId) existingOrderIds.add(rawOrderId);
            sheetImported++;
            totalImported++;
          }

          sheetResults.push({
            sheet: sheetName,
            imported: sheetImported,
            skipped: sheetSkipped,
            duplicate: sheetDuplicate,
          });
        }

        return res.json({
          success: true,
          totalImported,
          totalSkipped,
          totalDuplicate,
          sheets: sheetResults,
        });
      } catch (err: any) {
        return res.status(500).json({ error: String(err.message ?? err) });
      }
    }
  );
}
