import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { io, Socket } from "socket.io-client";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { PixelAvatarDisplay, DEFAULT_AVATAR } from "@/components/PixelAvatar";
import type { AvatarConfig } from "@/components/PixelAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Users, Send, Megaphone, Coins, Music, Beer, BookOpen, Sword, Zap } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Danmaku {
  id: string;
  text: string;
  color: string;
  top: number;
  speed: number;
  fontSize: number;
  glow: string;
  username: string;
}

interface OnlineCharacter {
  id: number;
  userId: number;
  nickname: string;
  combatClass: string;
  lifeClass: string;
  avatarConfig: string | null;
  tavernAction: string;
  level: number;
  combatInfo: { name: string; emoji: string };
  lifeInfo: { name: string; emoji: string };
  actionLabel: string;
}

const DANMAKU_COLORS = [
  "#ffffff", "#fbbf24", "#a78bfa", "#f472b6", "#34d399", "#60a5fa", "#fb923c"
];

const TAVERN_ACTIONS = [
  { id: "drinking",     label: "🍺 畅饮中",    icon: Beer },
  { id: "playing_lute", label: "🎵 弹琴中",    icon: Music },
  { id: "chatting",     label: "💬 闲聊中",    icon: Users },
  { id: "sleeping",     label: "😴 打盹中",    icon: Zap },
  { id: "arm_wrestling",label: "💪 掰腕子",   icon: Sword },
  { id: "reading",      label: "📖 看书中",    icon: BookOpen },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function Tavern() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  const [danmakus, setDanmakus] = useState<Danmaku[]>([]);
  const [inputText, setInputText] = useState("");
  const [onlineCount, setOnlineCount] = useState(0);
  const [selectedColor, setSelectedColor] = useState(DANMAKU_COLORS[0]);
  const [myAction, setMyAction] = useState("drinking");
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  const { data: profileData, isLoading: profileLoading } = trpc.rpg.getProfile.useQuery();
  const { data: onlineChars, refetch: refetchOnline } = trpc.rpg.getTavernOnline.useQuery();
  const { data: announcements } = trpc.plaza.listAnnouncements.useQuery();
  const { data: statusData } = trpc.plaza.getStatus.useQuery();
  const { data: payQrData } = trpc.plaza.getPaymentQR.useQuery();

  const updateProfileMutation = trpc.rpg.updateProfile.useMutation({
    onSuccess: () => refetchOnline(),
  });

  const feedMutation = trpc.plaza.sendGift.useMutation({
    onSuccess: (data: any) => {
      toast.success(`🎁 投喂成功！剩余 ${data.newBalance} 金币`);
      triggerFireworks();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const profile = profileData?.profile;
  const avatarConfig: AvatarConfig = profile?.avatarConfig
    ? JSON.parse(profile.avatarConfig)
    : DEFAULT_AVATAR;

  // No redirect - show inline prompt instead

  // Set initial tavern action
  useEffect(() => {
    if (profile?.tavernAction) setMyAction(profile.tavernAction);
  }, [profile]);

  // ── Socket.IO ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io({ path: "/api/socket.io", transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("danmaku:new", (msg: { text: string; username: string; color?: string }) => {
      addDanmaku(msg.text, msg.username, msg.color);
    });

    socket.on("online:count", (data: number | { count: number }) => {
      setOnlineCount(typeof data === 'number' ? data : (data?.count ?? 0));
    });

    socket.on("coins:update", (data: { userId: number; newBalance: number }) => {
      if (data.userId === user?.id) {
        toast.success(`🪙 你的金币更新为 ${data.newBalance}！`);
        triggerFireworks();
      }
    });

    socket.on("feed:event", (data: { username: string; giftName: string }) => {
      addDanmaku(`🎁 ${data.username} 投喂了${data.giftName}！`, "系统", "#fbbf24");
    });

    socket.on("announcement:new", (ann: { title: string; content: string }) => {
      addDanmaku(`📢 王国公告：${ann.title}`, "法师大人", "#f472b6");
      toast.info(`📢 ${ann.title}: ${ann.content}`, { duration: 8000 });
    });

    return () => { socket.disconnect(); };
  }, [user?.id]);

  // ── Danmaku logic ──────────────────────────────────────────────────────────
  const addDanmaku = useCallback((text: string, username: string, color?: string) => {
    const id = Math.random().toString(36).slice(2);
    const chosenColor = color ?? DANMAKU_COLORS[Math.floor(Math.random() * DANMAKU_COLORS.length)];
    const fontSize = Math.floor(Math.random() * 10) + 18; // 18-28px
    const speed = Math.floor(Math.random() * 6) + 7; // 7-13s
    const top = Math.floor(Math.random() * 70) + 5; // 5-75%
    const glowColor = chosenColor;

    const danmaku: Danmaku = {
      id, text: `${username}: ${text}`, color: chosenColor,
      top, speed, fontSize,
      glow: `0 0 8px ${glowColor}, 0 0 16px ${glowColor}40`,
      username,
    };

    setDanmakus(prev => [...prev.slice(-40), danmaku]);
    setTimeout(() => {
      setDanmakus(prev => prev.filter(d => d.id !== id));
    }, speed * 1000 + 500);
  }, []);

  const sendDanmaku = () => {
    if (!inputText.trim()) return;
    socketRef.current?.emit("danmaku:send", { text: inputText.trim(), color: selectedColor });
    setInputText("");
  };

  // ── Fireworks ──────────────────────────────────────────────────────────────
  const [fireworks, setFireworks] = useState<Array<{ id: string; x: number; y: number; color: string }>>([]);

  const triggerFireworks = useCallback(() => {
    const newFw = Array.from({ length: 20 }, (_, i) => ({
      id: Math.random().toString(36).slice(2),
      x: Math.random() * 100,
      y: Math.random() * 60 + 10,
      color: ["#f59e0b", "#8b5cf6", "#ec4899", "#10b981", "#3b82f6"][i % 5],
    }));
    setFireworks(newFw);
    setTimeout(() => setFireworks([]), 2500);
  }, []);

  // ── Action change ──────────────────────────────────────────────────────────
  const handleActionChange = (action: string) => {
    setMyAction(action);
    updateProfileMutation.mutate({ tavernAction: action as any });
  };

  const isOwner = user?.role === "admin" || user?.role === "owner"; // admin = merged owner+admin

  const statusInfo: Record<string, { emoji: string; label: string }> = {
    writing:  { emoji: "✍️",  label: "奋笔疾书中" },
    gaming:   { emoji: "🎮",  label: "游戏中" },
    exercise: { emoji: "🏋️", label: "健身中" },
    sleeping: { emoji: "😴",  label: "休息中" },
    eating:   { emoji: "🍜",  label: "觅食中" },
    offline:  { emoji: "🌙",  label: "不在线" },
  };
  const currentStatus = statusData?.status ?? "offline";
  const statusDisplay = statusInfo[currentStatus] ?? statusInfo.offline;

  // If profile not loaded yet, show loading; if no profile, show setup prompt
  if (profileLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-purple-300 text-center">
            <div className="text-4xl mb-3 animate-pulse">🍺</div>
            <p>正在进入酒馆...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <div className="text-6xl">🧙</div>
            <h2 className="text-xl font-bold text-white">还没有创建角色</h2>
            <p className="text-purple-300 text-sm">进入酒馆前，请先创建你的专属角色！</p>
            <button
              onClick={() => navigate("/character-setup")}
              className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-xl font-medium transition-all"
            >
              ✨ 立即创建角色
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Fireworks overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {fireworks.map(fw => (
          <div
            key={fw.id}
            className="absolute w-4 h-4 rounded-full animate-ping"
            style={{ left: fw.x + "%", top: fw.y + "%", backgroundColor: fw.color, animationDuration: "0.8s" }}
          />
        ))}
      </div>

      {/* Danmaku overlay */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        {danmakus.map(d => (
          <div
            key={d.id}
            className="absolute whitespace-nowrap font-bold"
            style={{
              top: d.top + "%",
              color: d.color,
              fontSize: d.fontSize + "px",
              textShadow: d.glow,
              animation: `danmaku-fly ${d.speed}s linear forwards`,
              WebkitTextStroke: "1px rgba(0,0,0,0.5)",
            }}
          >
            {d.text}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes danmaku-fly {
          from { transform: translateX(110vw); }
          to   { transform: translateX(-110vw); }
        }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              🍺 魔法酒馆
            </h1>
            <p className="text-purple-300 text-sm">王国居民的聚集地，与法师大人实时互动～</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1.5 bg-purple-900/40 border border-purple-500/30 rounded-full px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-300 font-medium">{onlineCount} 人在线</span>
            </div>
          </div>
        </div>

        {/* Owner status card */}
        <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border border-purple-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-purple-800/50 flex items-center justify-center">
                <span className="text-3xl">🧙‍♀️</span>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-purple-600 rounded-full px-1.5 py-0.5 text-xs text-white font-bold">
                {statusDisplay.emoji}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-bold text-lg">小炮法师大人</span>
                <span className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 text-xs px-2 py-0.5 rounded-full">👑 王国法师</span>
                <span className="bg-purple-500/20 border border-purple-500/50 text-purple-300 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  实时状态
                </span>
              </div>
              <div className="text-purple-300 text-sm">{statusDisplay.emoji} {statusDisplay.label}</div>
              {statusData?.customMessage && (
                <div className="text-purple-200 text-sm mt-1 italic">"{statusData.customMessage}"</div>
              )}
              <div className="flex items-center gap-1 mt-1 text-xs text-purple-400">
                <Coins className="w-3 h-3" />
                <span>我的金币：🪙 {user?.coins ?? 0}</span>
                <span className="text-purple-400 text-xs">（¥1 = 🪙10）</span>            </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                onClick={() => setShowGiftModal(true)}
                className="bg-pink-600/80 hover:bg-pink-500 text-white text-xs"
              >
                🎁 投喂法师大人
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowPayModal(true)}
                className="border-yellow-500/50 text-yellow-300 hover:bg-yellow-900/30 text-xs"
              >
                💰 打赏王国
              </Button>
            </div>
          </div>
        </div>

        {/* Latest announcements */}
        {announcements && announcements.length > 0 && (
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 text-amber-300 text-sm font-medium mb-2">
              <Megaphone className="w-4 h-4" />
              最新王国公告
            </div>
              {(announcements ?? []).slice(0, 1).map((ann: any) => (
              <div key={ann.id} className="text-amber-100 text-sm">
                <span className="font-bold">{ann.title}</span>
                {ann.content && <span className="text-amber-200 ml-2">{ann.content}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Online characters in tavern */}
        <div className="bg-purple-900/30 border border-purple-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-purple-400" />
            <span className="text-white font-medium">酒馆居民</span>
            <span className="text-purple-400 text-sm">({onlineChars?.length ?? 0} 人)</span>
          </div>

          {!onlineChars || onlineChars.length === 0 ? (
            <div className="text-center py-8 text-purple-400">
              <div className="text-4xl mb-2">🍺</div>
              <p className="text-sm">酒馆还没有居民，快去邀请朋友加入王国吧！</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {onlineChars.map(char => {
                const charAvatar: AvatarConfig = char.avatarConfig
                  ? JSON.parse(char.avatarConfig)
                  : DEFAULT_AVATAR;
                const isMe = char.userId === user?.id;
                return (
                  <div
                    key={char.id}
                    className={cn(
                      "bg-purple-900/40 border rounded-xl p-3 text-center transition-all",
                      isMe ? "border-purple-400 shadow-lg shadow-purple-500/20" : "border-purple-700/40"
                    )}
                  >
                    <div className="flex justify-center mb-2">
                      <PixelAvatarDisplay config={charAvatar} size="md" animated action={char.actionLabel} />
                    </div>
                    <div className="text-white font-bold text-xs truncate">{char.nickname}</div>
                    <div className="text-purple-400 text-xs mt-0.5">
                      {char.combatInfo.emoji} {char.combatInfo.name}
                    </div>
                    <div className="text-purple-300 text-xs mt-1 bg-purple-800/40 rounded-full px-2 py-0.5">
                      {char.actionLabel}
                    </div>
                    {isMe && (
                      <div className="mt-2">
                        <select
                          value={myAction}
                          onChange={e => handleActionChange(e.target.value)}
                          className="w-full text-xs bg-purple-800/50 border border-purple-600/50 text-purple-200 rounded-lg px-1 py-1"
                        >
                          {TAVERN_ACTIONS.map(a => (
                            <option key={a.id} value={a.id}>{a.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Danmaku send area */}
        <div className="bg-purple-900/30 border border-purple-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Send className="w-4 h-4 text-purple-400" />
            <span className="text-white font-medium text-sm">互动区</span>
            <span className="text-purple-400 text-xs">发送弹幕，全场可见～</span>
          </div>
          <div className="flex gap-2 mb-3">
            {DANMAKU_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={cn(
                  "w-6 h-6 rounded-full border-2 transition-all",
                  selectedColor === color ? "border-white scale-125" : "border-transparent"
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendDanmaku()}
              placeholder="发送弹幕，全场可见～（Enter 发送）"
              maxLength={50}
              className="bg-purple-900/50 border-purple-500/50 text-white placeholder:text-purple-400 flex-1"
              style={{ color: selectedColor }}
            />
            <Button
              onClick={sendDanmaku}
              disabled={!inputText.trim()}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4"
            >
              发射 🚀
            </Button>
          </div>
        </div>

        {/* My character quick actions */}
        {profile && (
          <div className="flex gap-3">
            <Button
              onClick={() => navigate("/character")}
              variant="outline"
              size="sm"
              className="border-purple-500/50 text-purple-300 hover:bg-purple-900/30"
            >
              👤 我的角色面板
            </Button>
            <Button
              onClick={() => navigate("/daily-quest")}
              size="sm"
              className="bg-purple-600/80 hover:bg-purple-500 text-white"
            >
              ⚔️ 今日冒险
            </Button>
          </div>
        )}
      </div>

      {/* Gift modal */}
      {showGiftModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowGiftModal(false)}>
          <div className="bg-purple-900 border border-purple-500/50 rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg mb-4 text-center">🎁 投喂法师大人</h3>
            <p className="text-purple-300 text-sm text-center mb-4">消耗金币投喂，为法师大人加油！</p>
            <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { name: "小蛋糕", emoji: "🍰", giftType: "cake" },
              { name: "魔法药水", emoji: "🧪", giftType: "flower" },
              { name: "星星礼盒", emoji: "⭐", giftType: "crystal" },
              { name: "小鸡腿", emoji: "🍗", giftType: "drumstick" },
              { name: "魔法权杖", emoji: "🪄", giftType: "magic_wand" },
              { name: "龙晶石", emoji: "💎", giftType: "crown" },
            ].map(gift => (
                <button
                  key={gift.name}
                  onClick={() => {
                    feedMutation.mutate({ giftType: gift.giftType as any });
                    setShowGiftModal(false);
                  }}
                  className="bg-purple-800/50 border border-purple-600/50 rounded-xl p-3 text-center hover:border-purple-400 transition-all"
                >
                  <div className="text-2xl mb-1">{gift.emoji}</div>
                  <div className="text-white text-xs font-bold">{gift.name}</div>
                  <div className="text-purple-400 text-xs">🪙 {String(({cake:10,flower:10,crystal:50,drumstick:30,magic_wand:100,crown:200})[gift.giftType] ?? 10)}</div>
                </button>
              ))}
            </div>
            <Button variant="ghost" onClick={() => setShowGiftModal(false)} className="w-full text-purple-400">取消</Button>
          </div>
        </div>
      )}

      {/* Pay QR modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowPayModal(false)}>
          <div className="bg-purple-900 border border-purple-500/50 rounded-2xl p-6 max-w-xs w-full text-center" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg mb-2">💰 打赏王国</h3>
            <p className="text-purple-300 text-sm mb-4">感谢你的支持！法师大人会继续创作的～</p>
            {payQrData && payQrData.length > 0 ? (
              <img src={(payQrData[0] as any).imageUrl} alt="收款码" className="w-48 h-48 mx-auto rounded-xl" />
            ) : (
              <div className="w-48 h-48 mx-auto bg-purple-800/50 rounded-xl flex items-center justify-center text-purple-400 text-sm">
                收款码暂未设置
              </div>
            )}
            <Button variant="ghost" onClick={() => setShowPayModal(false)} className="w-full text-purple-400 mt-4">关闭</Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
