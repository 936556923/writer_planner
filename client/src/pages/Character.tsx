import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Shield, Sword, Zap, Heart, Star, Package, Backpack,
  Warehouse, PawPrint, ChevronRight, Edit3, Sparkles, Crown,
  FlameIcon, Swords, BookOpen, Coins
} from "lucide-react";

// ── Combat class info ────────────────────────────────────────────────────────
const COMBAT_CLASS_INFO: Record<string, { name: string; emoji: string; color: string; stats: { atk: number; def: number; spd: number; mag: number } }> = {
  mage:        { name: "法师",     emoji: "🔮", color: "from-blue-600 to-purple-600",   stats: { atk: 60, def: 40, spd: 65, mag: 95 } },
  warrior:     { name: "战士",     emoji: "⚔️",  color: "from-red-600 to-orange-600",    stats: { atk: 90, def: 85, spd: 55, mag: 20 } },
  rogue:       { name: "刺客",     emoji: "🗡️",  color: "from-gray-600 to-slate-800",    stats: { atk: 85, def: 50, spd: 95, mag: 30 } },
  archer:      { name: "弓手",     emoji: "🏹", color: "from-green-600 to-teal-600",    stats: { atk: 80, def: 45, spd: 85, mag: 40 } },
  paladin:     { name: "圣骑士",   emoji: "🛡️",  color: "from-yellow-500 to-amber-600",  stats: { atk: 75, def: 90, spd: 50, mag: 60 } },
  necromancer: { name: "死灵法师", emoji: "💀", color: "from-purple-800 to-gray-900",   stats: { atk: 70, def: 45, spd: 60, mag: 90 } },
  owner:       { name: "法师大人", emoji: "✨", color: "from-purple-600 to-pink-600",   stats: { atk: 99, def: 99, spd: 99, mag: 99 } },
};

const LIFE_CLASS_INFO: Record<string, { name: string; emoji: string }> = {
  blacksmith: { name: "铁匠",     emoji: "⚒️" },
  merchant:   { name: "商人",     emoji: "💰" },
  chef:       { name: "厨师",     emoji: "🍳" },
  farmer:     { name: "农夫",     emoji: "🌾" },
  scholar:    { name: "学者",     emoji: "📚" },
  bard:       { name: "吟游诗人", emoji: "🎵" },
  alchemist:  { name: "炼金术士", emoji: "⚗️" },
  beggar:     { name: "乞丐",     emoji: "🎒" },
};

// ── Equipment slots ──────────────────────────────────────────────────────────
const EQUIP_SLOTS = [
  { id: "weapon",    label: "武器",   icon: "⚔️",  pos: "top-[8%] left-[10%]" },
  { id: "helmet",    label: "头盔",   icon: "🪖",  pos: "top-[8%] left-[38%]" },
  { id: "armor",     label: "护甲",   icon: "🛡️",  pos: "top-[30%] left-[10%]" },
  { id: "necklace",  label: "项链",   icon: "📿",  pos: "top-[8%] right-[10%]" },
  { id: "ring1",     label: "戒指",   icon: "💍",  pos: "top-[30%] right-[10%]" },
  { id: "boots",     label: "靴子",   icon: "👢",  pos: "bottom-[8%] left-[10%]" },
  { id: "gloves",    label: "手套",   icon: "🧤",  pos: "bottom-[8%] right-[10%]" },
  { id: "cloak",     label: "披风",   icon: "🧣",  pos: "bottom-[8%] left-[38%]" },
];

// ── Pet slots ────────────────────────────────────────────────────────────────
const PET_SLOTS = [
  { id: "pet1", label: "宠物1", icon: "🐉" },
  { id: "pet2", label: "宠物2", icon: "🦊" },
  { id: "pet3", label: "宠物3", icon: "🐺" },
];

// ── Inventory items (mock) ───────────────────────────────────────────────────
const MOCK_INVENTORY = [
  { id: 1, name: "魔法药水",   icon: "🧪", rarity: "common",    count: 5 },
  { id: 2, name: "经验卷轴",   icon: "📜", rarity: "rare",      count: 2 },
  { id: 3, name: "金币袋",     icon: "💰", rarity: "common",    count: 12 },
  { id: 4, name: "传送石",     icon: "💎", rarity: "epic",      count: 1 },
  { id: 5, name: "治愈草药",   icon: "🌿", rarity: "common",    count: 8 },
  { id: 6, name: "神秘宝箱",   icon: "📦", rarity: "legendary", count: 1 },
  { id: 7, name: "魔法羽毛",   icon: "🪶", rarity: "uncommon",  count: 3 },
  { id: 8, name: "星尘碎片",   icon: "⭐", rarity: "rare",      count: 4 },
];

const MOCK_WAREHOUSE = [
  { id: 1, name: "远古铠甲",   icon: "🛡️",  rarity: "epic",      count: 1 },
  { id: 2, name: "龙晶石",     icon: "🔮", rarity: "legendary", count: 2 },
  { id: 3, name: "魔导书",     icon: "📚", rarity: "rare",      count: 1 },
  { id: 4, name: "精灵弓",     icon: "🏹", rarity: "epic",      count: 1 },
];

const RARITY_COLORS: Record<string, string> = {
  common:    "border-gray-400/40 bg-gray-800/40",
  uncommon:  "border-green-400/40 bg-green-900/20",
  rare:      "border-blue-400/40 bg-blue-900/20",
  epic:      "border-purple-400/40 bg-purple-900/20",
  legendary: "border-yellow-400/60 bg-yellow-900/20",
};

const RARITY_LABEL: Record<string, string> = {
  common: "普通", uncommon: "优秀", rare: "稀有", epic: "史诗", legendary: "传说"
};

// ── Stat bar component ───────────────────────────────────────────────────────
function StatBar({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-white/70">{icon}{label}</span>
        <span className="font-bold text-white">{value}</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// ── Item grid component ──────────────────────────────────────────────────────
function ItemGrid({ items }: { items: typeof MOCK_INVENTORY }) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
      {items.map(item => (
        <div
          key={item.id}
          className={cn("relative rounded-lg border p-2 flex flex-col items-center gap-1 cursor-pointer hover:scale-105 transition-transform", RARITY_COLORS[item.rarity])}
          title={`${item.name} (${RARITY_LABEL[item.rarity]})`}
        >
          <span className="text-2xl">{item.icon}</span>
          <span className="text-[10px] text-white/70 text-center leading-tight">{item.name}</span>
          {item.count > 1 && (
            <span className="absolute top-1 right-1 text-[9px] bg-black/60 text-white rounded px-1">{item.count}</span>
          )}
        </div>
      ))}
      {/* Empty slots */}
      {Array.from({ length: Math.max(0, 24 - items.length) }).map((_, i) => (
        <div key={`empty-${i}`} className="rounded-lg border border-white/10 bg-white/5 p-2 flex items-center justify-center min-h-[64px]">
          <span className="text-white/20 text-xs">空</span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function Character() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"panel" | "inventory" | "warehouse" | "pets">("panel");

  const { data: profileData, isLoading } = trpc.rpg.getProfile.useQuery();

  // Redirect to setup if no profile
  if (!isLoading && profileData && !profileData.profile) {
    navigate("/character-setup");
    return null;
  }

  const profile = profileData?.profile;
  const combatInfo = profile?.combatClass ? COMBAT_CLASS_INFO[profile.combatClass] : COMBAT_CLASS_INFO["mage"];
  const lifeInfo = profile?.lifeClass ? LIFE_CLASS_INFO[profile.lifeClass] : { name: "未知", emoji: "❓" };

  // Compute HP/MP from level
  const level = profile?.level ?? 1;
  const maxHp = 100 + level * 20;
  const currentHp = maxHp; // full HP for now
  const maxMp = 50 + level * 10;
  const currentMp = maxMp;
  const maxExp = level * 100;
  const currentExp = profile?.exp ?? 0;
  const expPct = Math.min(100, Math.round((currentExp / maxExp) * 100));

  const stats = combatInfo.stats;

  const tabs = [
    { id: "panel",     label: "角色面板", icon: <Shield className="w-4 h-4" /> },
    { id: "inventory", label: "背包",     icon: <Backpack className="w-4 h-4" /> },
    { id: "warehouse", label: "仓库",     icon: <Warehouse className="w-4 h-4" /> },
    { id: "pets",      label: "宠物栏",   icon: <PawPrint className="w-4 h-4" /> },
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <div className="text-4xl animate-spin">✨</div>
            <p className="text-muted-foreground">召唤角色数据中...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${combatInfo.color} p-5 text-white shadow-xl`}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/10 blur-2xl" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-5xl shadow-inner shrink-0 border-2 border-white/30">
              {combatInfo.emoji}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-extrabold tracking-wide">
                  {profile?.nickname ?? user?.name ?? "未知勇士"}
                </h1>
                {(user?.role === "admin" || user?.role === "owner") && (
                  <Crown className="w-5 h-5 text-yellow-300" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className="bg-white/20 text-white border-white/30 text-xs">
                  {combatInfo.emoji} {combatInfo.name}
                </Badge>
                <Badge className="bg-white/20 text-white border-white/30 text-xs">
                  {lifeInfo.emoji} {lifeInfo.name}
                </Badge>
                <Badge className="bg-white/20 text-white border-white/30 text-xs">
                  Lv.{level}
                </Badge>
              </div>

              {/* HP / MP / EXP bars */}
              <div className="mt-3 space-y-1.5 max-w-sm">
                <div className="flex items-center gap-2">
                  <Heart className="w-3.5 h-3.5 text-red-300 shrink-0" />
                  <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full" style={{ width: `${(currentHp / maxHp) * 100}%` }} />
                  </div>
                  <span className="text-xs text-white/80 whitespace-nowrap">{currentHp}/{maxHp}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                  <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(currentMp / maxMp) * 100}%` }} />
                  </div>
                  <span className="text-xs text-white/80 whitespace-nowrap">{currentMp}/{maxMp}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                  <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${expPct}%` }} />
                  </div>
                  <span className="text-xs text-white/80 whitespace-nowrap">{currentExp}/{maxExp} EXP</span>
                </div>
              </div>
            </div>

            {/* Coins + Edit */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-1.5">
                <span className="text-lg">🪙</span>
                <span className="font-bold text-lg">{user?.coins ?? 0}</span>
                <span className="text-xs text-white/70">代币</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-white/80 hover:text-white hover:bg-white/20 text-xs"
                onClick={() => navigate("/character-setup")}
              >
                <Edit3 className="w-3.5 h-3.5 mr-1" />
                编辑角色
              </Button>
            </div>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                activeTab === tab.id
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-purple-300"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Panel Tab ───────────────────────────────────────────────────── */}
        {activeTab === "panel" && (
          <div className="grid gap-4 lg:grid-cols-5">

            {/* Equipment panel (left) */}
            <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-purple-950 rounded-2xl border border-purple-500/20 p-4 shadow-xl">
              <h3 className="text-sm font-bold text-white/80 mb-3 flex items-center gap-2">
                <Sword className="w-4 h-4 text-purple-400" />
                装备栏
              </h3>
              <div className="relative aspect-[3/4] max-w-[220px] mx-auto">
                {/* Character silhouette */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-[80px] opacity-30 select-none">{combatInfo.emoji}</div>
                </div>

                {/* Equipment slots */}
                {EQUIP_SLOTS.map(slot => (
                  <div
                    key={slot.id}
                    className={cn(
                      "absolute w-12 h-12 rounded-xl border-2 border-dashed border-purple-500/40 bg-purple-900/30",
                      "flex flex-col items-center justify-center cursor-pointer",
                      "hover:border-purple-400 hover:bg-purple-800/40 transition-all group",
                      slot.pos
                    )}
                    title={slot.label}
                  >
                    <span className="text-lg group-hover:scale-110 transition-transform">{slot.icon}</span>
                    <span className="text-[9px] text-purple-300/60 group-hover:text-purple-200">{slot.label}</span>
                  </div>
                ))}
              </div>

              {/* Chest slot (胸卦) - special */}
              <div className="mt-3 p-3 rounded-xl border border-yellow-500/30 bg-yellow-900/10 flex items-center gap-3 cursor-pointer hover:bg-yellow-900/20 transition-colors">
                <span className="text-2xl">🔯</span>
                <div>
                  <p className="text-xs font-bold text-yellow-300">胸卦</p>
                  <p className="text-[10px] text-yellow-300/60">神秘符文槽 · 空置</p>
                </div>
                <ChevronRight className="w-4 h-4 text-yellow-300/40 ml-auto" />
              </div>
            </div>

            {/* Stats panel (right) */}
            <div className="lg:col-span-3 space-y-4">

              {/* Ability stats */}
              <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  能力值
                </h3>
                <div className="space-y-3">
                  <StatBar label="攻击" value={stats.atk} icon={<Swords className="w-3 h-3" />} color="bg-red-500" />
                  <StatBar label="防御" value={stats.def} icon={<Shield className="w-3 h-3" />} color="bg-blue-500" />
                  <StatBar label="速度" value={stats.spd} icon={<Zap className="w-3 h-3" />} color="bg-green-500" />
                  <StatBar label="魔法" value={stats.mag} icon={<Sparkles className="w-3 h-3" />} color="bg-purple-500" />
                  <StatBar label="生命" value={Math.min(100, Math.round((currentHp / maxHp) * 100))} icon={<Heart className="w-3 h-3" />} color="bg-pink-500" />
                </div>
              </div>

              {/* Character info */}
              <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-500" />
                  角色信息
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "等级",     value: `Lv.${level}`,                icon: "⭐" },
                    { label: "战斗职业", value: combatInfo.name,               icon: combatInfo.emoji },
                    { label: "生活职业", value: lifeInfo.name,                 icon: lifeInfo.emoji },
                    { label: "魔法代币", value: `${user?.coins ?? 0} 枚`,      icon: "🪙" },
                    { label: "经验值",   value: `${currentExp} / ${maxExp}`,   icon: "✨" },
                    { label: "角色ID",   value: profile?.nickname ?? "未设置", icon: "🏷️" },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2 p-2 rounded-xl bg-muted/50">
                      <span className="text-base">{item.icon}</span>
                      <div>
                        <p className="text-[10px] text-muted-foreground">{item.label}</p>
                        <p className="text-xs font-semibold">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* EXP progress */}
              <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    升级进度
                  </h3>
                  <span className="text-xs text-muted-foreground">{expPct}%</span>
                </div>
                <Progress value={expPct} className="h-3" />
                <p className="text-xs text-muted-foreground mt-2">
                  距离 Lv.{level + 1} 还需 {maxExp - currentExp} 经验值
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Inventory Tab ────────────────────────────────────────────────── */}
        {activeTab === "inventory" && (
          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Backpack className="w-4 h-4 text-amber-500" />
                背包
                <span className="text-xs text-muted-foreground font-normal">({MOCK_INVENTORY.length}/24 格)</span>
              </h3>
              <div className="flex gap-1">
                {Object.entries(RARITY_LABEL).map(([key, label]) => (
                  <span key={key} className={cn("text-[9px] px-1.5 py-0.5 rounded border", RARITY_COLORS[key], "text-white/70")}>
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <ItemGrid items={MOCK_INVENTORY} />
          </div>
        )}

        {/* ── Warehouse Tab ────────────────────────────────────────────────── */}
        {activeTab === "warehouse" && (
          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-blue-500" />
                仓库
                <span className="text-xs text-muted-foreground font-normal">({MOCK_WAREHOUSE.length}/48 格)</span>
              </h3>
            </div>
            <ItemGrid items={MOCK_WAREHOUSE} />
          </div>
        )}

        {/* ── Pets Tab ─────────────────────────────────────────────────────── */}
        {activeTab === "pets" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {PET_SLOTS.map((slot, i) => (
                <div
                  key={slot.id}
                  className={cn(
                    "rounded-2xl border p-5 flex flex-col items-center gap-3 cursor-pointer transition-all",
                    i === 0
                      ? "border-purple-500/40 bg-gradient-to-br from-purple-900/30 to-pink-900/20 hover:border-purple-400"
                      : "border-dashed border-white/20 bg-card hover:border-purple-300/40"
                  )}
                >
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center text-4xl",
                    i === 0 ? "bg-purple-500/20" : "bg-muted"
                  )}>
                    {i === 0 ? "🐉" : <span className="text-muted-foreground text-2xl">+</span>}
                  </div>
                  <div className="text-center">
                    {i === 0 ? (
                      <>
                        <p className="font-bold text-sm">小火龙</p>
                        <p className="text-xs text-muted-foreground">Lv.3 · 火焰系</p>
                        <div className="flex gap-1 mt-2 justify-center">
                          <Badge variant="outline" className="text-[9px] px-1.5 border-red-400/40 text-red-400">+15 ATK</Badge>
                          <Badge variant="outline" className="text-[9px] px-1.5 border-orange-400/40 text-orange-400">+10 MAG</Badge>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">{slot.label}</p>
                        <p className="text-xs text-muted-foreground/60">空置</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pet info */}
            <div className="bg-card rounded-2xl border border-border p-4">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <PawPrint className="w-4 h-4 text-green-500" />
                宠物说明
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                宠物可以为角色提供额外属性加成。每位冒险者最多携带 3 只宠物上阵。
                通过完成每日剧情任务、参与广场活动可以获得宠物蛋，孵化后即可获得新宠物。
                宠物升级后会解锁新的技能和更强的属性加成。
              </p>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
