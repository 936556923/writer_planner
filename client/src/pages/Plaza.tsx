import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";
import { Link } from "wouter";

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  dungeon: {
    label: "⚔️ 副本中",
    desc: "法师大人正在征讨副本，勿扰！",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663398587687/Ep6Daba2dSSUv99tCFqAvL/status-dungeon-cvNJGcfnKqjGWFGX2yeoPT.webp",
    glow: "#a855f7",
    bg: "rgba(88,28,135,0.65)",
  },
  exercise: {
    label: "🏋️ 健身中",
    desc: "法师大人正在修炼魔力，请勿打扰！",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663398587687/Ep6Daba2dSSUv99tCFqAvL/status-exercise-UvGnXMrCRzVzGteJMTQZMg.webp",
    glow: "#f97316",
    bg: "rgba(154,52,18,0.65)",
  },
  eating: {
    label: "🍜 吃饭中",
    desc: "法师大人正在补充魔力，稍后回来～",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663398587687/Ep6Daba2dSSUv99tCFqAvL/status-eating-nk5bGBXFfzZ8mxnsjfubFF.webp",
    glow: "#eab308",
    bg: "rgba(120,53,15,0.65)",
  },
  playing_dog: {
    label: "🐕 玩狗中",
    desc: "法师大人正在和大黄狗玩耍！",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663398587687/Ep6Daba2dSSUv99tCFqAvL/status-dog-fkwxv9KKBoNWnc25TB4LyM.webp",
    glow: "#f59e0b",
    bg: "rgba(120,53,15,0.65)",
  },
  slacking: {
    label: "🐟 摸鱼中",
    desc: "法师大人正在…战略性休息中",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663398587687/Ep6Daba2dSSUv99tCFqAvL/status-slack-XYXLjhbCdGCYYLUC9f8Cmw.webp",
    glow: "#14b8a6",
    bg: "rgba(19,78,74,0.65)",
  },
  sleeping: {
    label: "😴 睡觉中",
    desc: "王国进入夜间模式，明天见～",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663398587687/Ep6Daba2dSSUv99tCFqAvL/status-sleep-BcB6wXRCmvkSkovaqyEAPm.webp",
    glow: "#3b82f6",
    bg: "rgba(30,27,75,0.65)",
  },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

// ── Gift config ────────────────────────────────────────────────────────────────
const GIFTS = [
  { type: "flower" as const, emoji: "🌸", name: "鲜花", cost: 10 },
  { type: "drumstick" as const, emoji: "🍗", name: "鸡腿", cost: 30 },
  { type: "cake" as const, emoji: "🎂", name: "蛋糕", cost: 50 },
  { type: "crystal" as const, emoji: "💎", name: "魔法水晶", cost: 100 },
  { type: "crown" as const, emoji: "👑", name: "王冠", cost: 500 },
  { type: "magic_wand" as const, emoji: "🪄", name: "魔法棒", cost: 1000 },
];

// ── Danmaku item ───────────────────────────────────────────────────────────────
interface DanmakuItem {
  id: string;
  text: string;
  top: number;
  color: string;
  duration: number;
  fontSize: number;
  strokeColor: string;
  bold: boolean;
}

const DANMAKU_COLORS = [
  "#ffffff", "#ffd700", "#ff69b4", "#00ffff", "#98fb98",
  "#ff6347", "#dda0dd", "#87ceeb", "#ffa07a", "#7fffd4",
  "#ff4500", "#adff2f", "#ff1493", "#00fa9a", "#ff8c00",
];

// Stroke colors for readability
const STROKE_MAP: Record<string, string> = {
  "#ffffff": "#3b0764",
  "#ffd700": "#78350f",
  "#ff69b4": "#500724",
  "#00ffff": "#164e63",
  "#98fb98": "#14532d",
  "#ff6347": "#7f1d1d",
  "#dda0dd": "#4a044e",
  "#87ceeb": "#1e3a5f",
  "#ffa07a": "#7c2d12",
  "#7fffd4": "#134e4a",
  "#ff4500": "#7f1d1d",
  "#adff2f": "#365314",
  "#ff1493": "#500724",
  "#00fa9a": "#064e3b",
  "#ff8c00": "#78350f",
};

interface Particle {
  id: string;
  x: number;
  y: number;
  emoji: string;
  vx: number;
  vy: number;
  size: number;
}

// ── Stars (stable, computed once) ─────────────────────────────────────────────
const STARS = Array.from({ length: 100 }, (_, i) => ({
  id: i,
  w: (((i * 7 + 3) % 25) / 10 + 0.5),
  left: ((i * 137.5) % 100),
  top: ((i * 97.3) % 100),
  opacity: ((i * 31) % 60) / 100 + 0.2,
  dur: 2 + ((i * 13) % 50) / 10,
  delay: ((i * 17) % 50) / 10,
}));

export default function Plaza() {
  const { user } = useAuth();
  const isOwner = (user as any)?.role === "admin" || (user as any)?.role === "owner"; // owner+admin merged

  // ── Data queries ──────────────────────────────────────────────────────────────
  const { data: statusData, refetch: refetchStatus } = trpc.plaza.getStatus.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const { data: announcements, refetch: refetchAnnouncements } = trpc.plaza.listAnnouncements.useQuery();
  const { data: myCoins, refetch: refetchCoins } = trpc.plaza.myCoins.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: paymentCodes } = trpc.plaza.getPaymentQR.useQuery();

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const sendDanmakuMutation = trpc.plaza.sendDanmaku.useMutation({
    onError: (e) => toast.error(e.message || "发送失败"),
  });
  const sendGiftMutation = trpc.plaza.sendGift.useMutation({
    onSuccess: () => {
      refetchCoins();
      toast.success("投喂成功！法师大人收到啦～ 🎉");
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Local state ───────────────────────────────────────────────────────────────
  const [danmakuList, setDanmakuList] = useState<DanmakuItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [showGifts, setShowGifts] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [currentStatus, setCurrentStatus] = useState<StatusKey>("dungeon");
  const [customMessage, setCustomMessage] = useState<string>("");
  const [onlineCount, setOnlineCount] = useState(1);
  const [fireworks, setFireworks] = useState<Array<{ id: string; x: number; y: number; emoji: string }>>([]);
  const socketRef = useRef<Socket | null>(null);

  // ── Sync status from server ────────────────────────────────────────────────────
  useEffect(() => {
    if (statusData?.status) {
      setCurrentStatus(statusData.status as StatusKey);
      setCustomMessage(statusData.customMessage || "");
    }
  }, [statusData]);

  // ── WebSocket connection ───────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io("/", {
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("online:count", (data: { count: number }) => {
      setOnlineCount(data.count);
    });

    socket.on("danmaku:new", (data: { content: string; color: string; senderName: string }) => {
      addDanmaku(`${data.senderName || "匿名居民"}: ${data.content}`, data.color || undefined);
    });

    socket.on("danmaku:history", (history: Array<{ content: string; color: string; senderName: string }>) => {
      history.slice(-8).forEach((d, i) => {
        setTimeout(() => {
          addDanmaku(`${d.senderName || "匿名居民"}: ${d.content}`, d.color || undefined);
        }, i * 500);
      });
    });

    socket.on("gift:received", (data: { giftType: string; senderName: string }) => {
      const gift = GIFTS.find((g) => g.type === data.giftType);
      if (gift) {
        addDanmaku(`🎁 ${data.senderName} 投喂了 ${gift.emoji}${gift.name}！`, "#ffd700");
        spawnFireworks(gift.emoji);
      }
    });

    socket.on("status:update", (data: { status: string; customMessage?: string | null }) => {
      if (data.status) setCurrentStatus(data.status as StatusKey);
      setCustomMessage(data.customMessage || "");
      refetchStatus();
    });

    socket.on("announcement:new", () => {
      refetchAnnouncements();
      toast.info("📜 法师大人发布了新公告！");
    });

    // Real-time coin balance sync — ¥1 = 🪙10
    socket.on("coins:update", (data: {
      userId: number;
      newBalance: number;
      amount: number;
      senderName: string;
      recipientName: string;
      note?: string | null;
    }) => {
      const currentUserId = (user as any)?.id;
      if (currentUserId && data.userId === currentUserId) {
        refetchCoins();
        if (data.amount > 0) {
          toast.success(`🪙 法师大人赐予了你 ${data.amount} 金币！当前余额：${data.newBalance}`, {
            duration: 5000,
          });
          spawnFireworks("🪙");
          addDanmaku(`✨ ${data.recipientName} 获得了 ${data.amount} 金币！`, "#ffd700");
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Spawn fireworks (full-screen) ──────────────────────────────────────────────
  const spawnFireworks = useCallback((emoji: string) => {
    const count = 20;
    const newFireworks = Array.from({ length: count }, (_, i) => ({
      id: `fw-${Date.now()}-${i}`,
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
      emoji,
    }));
    setFireworks((prev) => [...prev, ...newFireworks]);
    setTimeout(() => {
      setFireworks((prev) => prev.filter((p) => !newFireworks.find((n) => n.id === p.id)));
    }, 2500);
  }, []);

  // ── Spawn particles (local) ────────────────────────────────────────────────────
  const spawnParticles = useCallback((emoji: string) => {
    const newParticles: Particle[] = Array.from({ length: 12 }, (_, i) => ({
      id: `p-${Date.now()}-${i}`,
      x: 30 + Math.random() * 40,
      y: 30 + Math.random() * 40,
      emoji,
      vx: (Math.random() - 0.5) * 4,
      vy: -(1 + Math.random() * 3),
      size: 20 + Math.floor(Math.random() * 20),
    }));
    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.find((n) => n.id === p.id)));
    }, 2800);
  }, []);

  // ── Add danmaku ────────────────────────────────────────────────────────────────
  const addDanmaku = useCallback((text: string, color?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    const chosenColor = color || DANMAKU_COLORS[Math.floor(Math.random() * DANMAKU_COLORS.length)];
    // Vary sizes: 40% chance big (22-28px), 60% normal (18-22px)
    const isBig = Math.random() < 0.4;
    const fontSize = isBig ? 22 + Math.floor(Math.random() * 7) : 18 + Math.floor(Math.random() * 5);
    const item: DanmakuItem = {
      id,
      text,
      top: 3 + Math.random() * 75,
      color: chosenColor,
      duration: 7 + Math.random() * 6,
      fontSize,
      strokeColor: STROKE_MAP[chosenColor] || "#1a0a2e",
      bold: isBig,
    };
    setDanmakuList((prev) => [...prev.slice(-50), item]);
    setTimeout(() => {
      setDanmakuList((prev) => prev.filter((d) => d.id !== id));
    }, (item.duration + 1) * 1000);
  }, []);

  // ── Send danmaku ───────────────────────────────────────────────────────────────
  const handleSendDanmaku = async () => {
    if (!inputText.trim()) return;
    if (!user) { toast.error("请先登录才能发送弹幕哦～"); return; }
    try {
      await sendDanmakuMutation.mutateAsync({ content: inputText.trim() });
      setInputText("");
    } catch {
      // handled by onError
    }
  };

  // ── Send gift ──────────────────────────────────────────────────────────────────
  const handleSendGift = async (giftType: typeof GIFTS[number]["type"], cost: number, emoji: string) => {
    if (!user) { toast.error("请先登录才能投喂哦～"); return; }
    if ((myCoins?.coins ?? 0) < cost) {
      toast.error(`金币不足！需要 ${cost} 金币，当前只有 ${myCoins?.coins ?? 0} 金币`);
      return;
    }
    await sendGiftMutation.mutateAsync({ giftType, message: "" });
    spawnFireworks(emoji);
    spawnParticles(emoji);
    setShowGifts(false);
  };

  const statusCfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.dungeon;

  return (
    <div
      className="min-h-screen text-white relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0f0520 0%, #1a0a2e 40%, #0d1b3e 100%)" }}
    >
      {/* Starfield */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {STARS.map((s) => (
          <div
            key={s.id}
            className="absolute rounded-full bg-white"
            style={{
              width: s.w + "px",
              height: s.w + "px",
              left: s.left + "%",
              top: s.top + "%",
              opacity: s.opacity,
              animation: `twinkle ${s.dur}s ease-in-out infinite`,
              animationDelay: s.delay + "s",
            }}
          />
        ))}
      </div>

      {/* ── Danmaku layer (full screen, behind UI) ─────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-20 overflow-hidden">
        {danmakuList.map((d) => (
          <div
            key={d.id}
            className="absolute whitespace-nowrap px-1"
            style={{
              top: `${d.top}%`,
              right: "-600px",
              color: d.color,
              fontSize: d.fontSize + "px",
              fontWeight: d.bold ? "900" : "700",
              fontFamily: "'Ma Shan Zheng', cursive, sans-serif",
              textShadow: `
                0 0 12px ${d.color},
                0 0 24px ${d.color}80,
                2px 2px 0 ${d.strokeColor},
                -1px -1px 0 ${d.strokeColor},
                1px -1px 0 ${d.strokeColor},
                -1px 1px 0 ${d.strokeColor}
              `,
              animation: `danmaku-fly ${d.duration}s linear forwards`,
              letterSpacing: "0.05em",
            }}
          >
            {d.text}
          </div>
        ))}
      </div>

      {/* ── Full-screen fireworks ─────────────────────────────────────────────── */}
      {fireworks.map((fw, i) => (
        <div
          key={fw.id}
          className="fixed pointer-events-none z-50"
          style={{
            left: `${fw.x}%`,
            top: `${fw.y}%`,
            fontSize: (24 + (i % 3) * 10) + "px",
            animation: `firework-burst ${1.5 + (i % 5) * 0.2}s ease-out forwards`,
            animationDelay: `${(i % 8) * 0.08}s`,
          }}
        >
          {fw.emoji}
        </div>
      ))}

      {/* ── Local particles ───────────────────────────────────────────────────── */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="fixed pointer-events-none z-40"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: p.size + "px",
            animation: "particle-rise 2.5s ease-out forwards",
          }}
        >
          {p.emoji}
        </div>
      ))}

      {/* Back button */}
      <div className="fixed top-4 left-4 z-40">
        <Link href="/">
          <Button
            variant="outline"
            size="sm"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
          >
            ← 回魔法世界
          </Button>
        </Link>
      </div>

      {/* Online count badge */}
      <div className="fixed top-4 right-4 z-40">
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm"
          style={{
            background: "rgba(168,85,247,0.18)",
            border: "1px solid rgba(168,85,247,0.4)",
            color: "#d8b4fe",
          }}
        >
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: "#4ade80", boxShadow: "0 0 6px #4ade80", animation: "pulse-dot 1.5s ease-in-out infinite" }}
          />
          {onlineCount} 人在线
        </div>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-16 pb-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-4xl font-bold mb-2"
            style={{
              fontFamily: "'Ma Shan Zheng', cursive",
              textShadow: "0 0 30px #a855f7, 0 0 60px #7c3aed",
            }}
          >
            ✨ 小炮的魔法广场 ✨
          </h1>
          <p className="text-purple-300 text-sm">王国居民的欢聚之地，与法师大人实时互动～</p>
        </div>

        {/* Status card */}
        <div
          className="relative rounded-2xl p-6 mb-6 overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${statusCfg.bg}, rgba(10,5,30,0.85))`,
            border: `1px solid ${statusCfg.glow}40`,
            boxShadow: `0 0 40px ${statusCfg.glow}25, inset 0 0 40px rgba(0,0,0,0.2)`,
          }}
        >
          <div
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-25"
            style={{ background: statusCfg.glow }}
          />

          <div className="flex items-center gap-5 relative">
            <div className="relative flex-shrink-0">
              <div
                className="absolute inset-0 rounded-full blur-2xl opacity-40"
                style={{ background: statusCfg.glow }}
              />
              <img
                src={statusCfg.img}
                alt={statusCfg.label}
                className="relative w-28 h-28 object-contain"
                style={{
                  imageRendering: "pixelated",
                  animation: "pixel-bounce 1.2s ease-in-out infinite",
                  filter: `drop-shadow(0 0 16px ${statusCfg.glow})`,
                }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="text-2xl font-bold">{statusCfg.label}</span>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"
                  style={{
                    background: `${statusCfg.glow}25`,
                    border: `1px solid ${statusCfg.glow}50`,
                    color: statusCfg.glow,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full inline-block"
                    style={{ background: "#4ade80", animation: "pulse-dot 1.5s ease-in-out infinite" }}
                  />
                  实时状态
                </span>
              </div>
              <p className="text-white/85 mb-3 leading-relaxed">
                {customMessage || statusCfg.desc}
              </p>
              {user && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 text-sm">我的金币：</span>
                    <span className="font-bold text-lg" style={{ color: "#fbbf24", textShadow: "0 0 12px #fbbf24" }}>
                      🪙 {myCoins?.coins ?? 0}
                    </span>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", color: "#fbbf24" }}
                  >
                    ¥1 = 🪙10
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Announcements */}
        {announcements && announcements.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-bold text-purple-300 mb-3 flex items-center gap-2 uppercase tracking-wider">
              <span>📜</span> 王国公告
            </h2>
            <div className="space-y-3">
              {announcements.slice(0, 5).map((ann: any) => (
                <div
                  key={ann.id}
                  className="rounded-xl p-4"
                  style={{
                    background: "rgba(88,28,135,0.12)",
                    border: "1px solid rgba(168,85,247,0.22)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    {ann.isPinned && <span className="text-yellow-400 text-sm mt-0.5 flex-shrink-0">📌</span>}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white mb-1">{ann.title}</h3>
                      <p className="text-purple-200 text-sm leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                      <p className="text-purple-400 text-xs mt-2">
                        {new Date(ann.createdAt).toLocaleDateString("zh-CN", {
                          year: "numeric", month: "long", day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interaction panel */}
        <div
          className="rounded-2xl p-5 mb-6"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(168,85,247,0.18)",
            backdropFilter: "blur(10px)",
          }}
        >
          <h2 className="text-sm font-bold text-purple-300 mb-4 flex items-center gap-2 uppercase tracking-wider">
            <span>💬</span> 互动区
            <span className="ml-auto text-xs text-purple-400/60 normal-case tracking-normal font-normal">
              弹幕全场可见，实时飘屏 ✨
            </span>
          </h2>

          {/* Danmaku input */}
          <div className="flex gap-2 mb-4">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendDanmaku()}
              placeholder={user ? "发送弹幕，全场可见～（Enter 发送）" : "登录后才能发送弹幕哦～"}
              disabled={!user || sendDanmakuMutation.isPending}
              className="flex-1 text-white placeholder:text-purple-400/60"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(168,85,247,0.35)",
                fontSize: "15px",
              }}
              maxLength={60}
            />
            <Button
              onClick={handleSendDanmaku}
              disabled={!user || !inputText.trim() || sendDanmakuMutation.isPending}
              className="px-5 font-bold text-white text-base"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", border: "none" }}
            >
              {sendDanmakuMutation.isPending ? "..." : "发射 🚀"}
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => { setShowGifts(!showGifts); setShowPayment(false); }}
              variant="outline"
              className="text-pink-300 hover:text-pink-200 bg-transparent font-bold"
              style={{
                background: showGifts ? "rgba(236,72,153,0.18)" : "transparent",
                border: "1px solid rgba(236,72,153,0.38)",
                fontSize: "14px",
              }}
              disabled={!user}
            >
              🎁 投喂法师大人
            </Button>
            <Button
              onClick={() => { setShowPayment(!showPayment); setShowGifts(false); }}
              variant="outline"
              className="text-yellow-300 hover:text-yellow-200 bg-transparent font-bold"
              style={{
                background: showPayment ? "rgba(234,179,8,0.18)" : "transparent",
                border: "1px solid rgba(234,179,8,0.38)",
                fontSize: "14px",
              }}
            >
              💰 打赏王国
            </Button>
            {isOwner && (
              <Link href="/admin">
                <Button
                  variant="outline"
                  className="text-cyan-300 hover:text-cyan-200 bg-transparent font-bold"
                  style={{ border: "1px solid rgba(34,211,238,0.38)", fontSize: "14px" }}
                >
                  ⚙️ 管理后台
                </Button>
              </Link>
            )}
          </div>

          {/* Gift panel */}
          {showGifts && user && (
            <div
              className="mt-4 p-4 rounded-xl"
              style={{
                background: "rgba(236,72,153,0.07)",
                border: "1px solid rgba(236,72,153,0.22)",
              }}
            >
              <p className="text-pink-300 text-sm mb-3">
                选择礼物投喂法师大人 ✨ 当前金币：
                <span className="text-yellow-300 font-bold ml-1 text-base">🪙 {myCoins?.coins ?? 0}</span>
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {GIFTS.map((gift) => {
                  const canAfford = (myCoins?.coins ?? 0) >= gift.cost;
                  return (
                    <button
                      key={gift.type}
                      onClick={() => handleSendGift(gift.type, gift.cost, gift.emoji)}
                      disabled={sendGiftMutation.isPending || !canAfford}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl transition-all hover:scale-110 active:scale-95"
                      style={{
                        background: canAfford ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                        border: canAfford ? "1px solid rgba(236,72,153,0.28)" : "1px solid rgba(255,255,255,0.08)",
                        opacity: canAfford ? 1 : 0.42,
                        cursor: canAfford ? "pointer" : "not-allowed",
                      }}
                    >
                      <span className="text-3xl">{gift.emoji}</span>
                      <span className="text-xs text-white/80">{gift.name}</span>
                      <span className="text-xs text-yellow-300 font-bold">🪙{gift.cost}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-purple-400/50 text-xs mt-3">
                * 金币由法师大人根据真实收入发放，¥1 = 10 金币
              </p>
            </div>
          )}

          {/* Payment panel */}
          {showPayment && (
            <div
              className="mt-4 p-5 rounded-xl text-center"
              style={{
                background: "rgba(234,179,8,0.05)",
                border: "1px solid rgba(234,179,8,0.22)",
              }}
            >
              {paymentCodes && paymentCodes.length > 0 ? (
                <>
                  <p className="text-yellow-300 font-bold mb-1 text-base">💛 感谢居民们对王国的支持！</p>
                  <p className="text-white/55 text-sm mb-4">你们的每一份心意都是法师大人前进的动力 ✨</p>
                  <div className="flex gap-6 justify-center flex-wrap">
                    {paymentCodes.map((code: any) => (
                      <div key={code.id} className="text-center">
                        <div
                          className="rounded-xl p-2 inline-block mb-2"
                          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(234,179,8,0.28)" }}
                        >
                          <img
                            src={code.imageUrl}
                            alt={code.platform}
                            className="w-36 h-36 object-contain rounded-lg"
                          />
                        </div>
                        <p className="text-yellow-200 text-sm font-medium">
                          {code.platform === "wechat" ? "微信支付" : "支付宝"}
                        </p>
                        {code.thankMessage && (
                          <p className="text-white/45 text-xs mt-1 max-w-[9rem] mx-auto">{code.thankMessage}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-6">
                  <p className="text-4xl mb-3">🏗️</p>
                  <p className="text-yellow-300/55 text-sm">法师大人还没有设置收款码～</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Login prompt */}
        {!user && (
          <div
            className="rounded-xl p-4 text-center"
            style={{
              background: "rgba(168,85,247,0.07)",
              border: "1px solid rgba(168,85,247,0.18)",
            }}
          >
            <p className="text-purple-300 text-sm">
              <Link href="/login" className="text-purple-400 underline underline-offset-2 hover:text-purple-300">
                登录
              </Link>
              {" "}或{" "}
              <Link href="/register" className="text-purple-400 underline underline-offset-2 hover:text-purple-300">
                注册
              </Link>
              {" "}后，即可发送弹幕、投喂法师大人、获得金币奖励！
            </p>
          </div>
        )}
      </div>

      {/* CSS animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap');
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.6); }
        }
        @keyframes danmaku-fly {
          from { transform: translateX(0); }
          to { transform: translateX(calc(-100vw - 800px)); }
        }
        @keyframes pixel-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-12px) scale(1.05); }
        }
        @keyframes particle-rise {
          0% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-160px) scale(0.2) rotate(360deg); opacity: 0; }
        }
        @keyframes firework-burst {
          0% { transform: translate(0, 0) scale(0.3) rotate(0deg); opacity: 1; }
          40% { transform: translate(var(--fx, 30px), var(--fy, -60px)) scale(1.4) rotate(180deg); opacity: 1; }
          100% { transform: translate(var(--fx2, 60px), var(--fy2, -120px)) scale(0.1) rotate(360deg); opacity: 0; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}
