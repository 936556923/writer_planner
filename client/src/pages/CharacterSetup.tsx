import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { AvatarCustomizer, PixelAvatarDisplay, DEFAULT_AVATAR, CLASS_OUTFITS } from "@/components/PixelAvatar";
import type { AvatarConfig } from "@/components/PixelAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Data ────────────────────────────────────────────────────────────────────

const COMBAT_CLASSES = [
  { id: "mage",        name: "法师",   emoji: "🔮", desc: "精通魔法，智慧超群，擅长远程攻击和元素魔法" },
  { id: "warrior",     name: "战士",   emoji: "⚔️", desc: "力大无穷，铁甲护身，前线冲锋的无畏勇士" },
  { id: "rogue",       name: "刺客",   emoji: "🗡️", desc: "身手敏捷，暗影潜行，一击必杀的暗夜猎手" },
  { id: "archer",      name: "弓手",   emoji: "🏹", desc: "百步穿杨，眼疾手快，远距离精准打击的猎人" },
  { id: "paladin",     name: "圣骑士", emoji: "🛡️", desc: "正义化身，圣光加持，攻守兼备的神圣战士" },
  { id: "necromancer", name: "死灵法师", emoji: "💀", desc: "掌控亡灵，操纵黑暗，神秘莫测的禁忌术士" },
];

const LIFE_CLASSES = [
  { id: "blacksmith", name: "铁匠",   emoji: "⚒️",  desc: "锻造武器装备，为王国勇士提供最强战甲" },
  { id: "merchant",   name: "商人",   emoji: "💰",  desc: "走南闯北，货通四方，王国经济的重要支柱" },
  { id: "chef",       name: "厨师",   emoji: "🍳",  desc: "烹饪美食佳肴，让王国居民吃饱喝足有力气" },
  { id: "farmer",     name: "农夫",   emoji: "🌾",  desc: "辛勤耕耘，收获丰盈，王国粮食的守护者" },
  { id: "scholar",    name: "学者",   emoji: "📚",  desc: "博览群书，通晓古今，王国智慧的传承者" },
  { id: "bard",       name: "吟游诗人", emoji: "🎵", desc: "以歌传情，以诗记史，王国文化的灵魂人物" },
  { id: "alchemist",  name: "炼金术士", emoji: "⚗️", desc: "调配药剂，炼制秘药，神奇药水的创造者" },
  { id: "beggar",     name: "乞丐",   emoji: "🎒",  desc: "走遍王国每个角落，见过最多人情冷暖的流浪者" },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function CharacterSetup() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [step, setStep] = useState(1); // 1=ID, 2=combat, 3=life, 4=avatar
  const [nickname, setNickname] = useState(user?.name ?? "");
  const [combatClass, setCombatClass] = useState("");
  const [lifeClass, setLifeClass] = useState("");
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>({
    ...DEFAULT_AVATAR,
    primaryColor: "#7c3aed",
    secondaryColor: "#f59e0b",
  });

  const { data: profileData, isLoading: profileLoading } = trpc.rpg.getProfile.useQuery();

  const setupMutation = trpc.rpg.setupProfile.useMutation({
    onSuccess: () => {
      utils.rpg.getProfile.invalidate();
      toast.success("✨ 角色创建成功！欢迎来到小炮王国！");
      navigate("/character");
    },
    onError: (err) => toast.error(err.message),
  });

  const isOwner = user?.role === "admin" || user?.role === "owner"; // admin = merged owner+admin

  // If profile already set up, redirect to character panel (after all hooks)
  if (!profileLoading && profileData?.profile?.profileSetupDone) {
    navigate("/character");
    return null;
  }

  const handleFinish = () => {
    if (!nickname.trim()) { toast.error("请输入角色ID"); return; }
    if (!isOwner && !combatClass) { toast.error("请选择战斗职业"); return; }
    if (!lifeClass) { toast.error("请选择生活职业"); return; }
    setupMutation.mutate({
      nickname: nickname.trim(),
      combatClass: (isOwner ? "owner" : combatClass) as any,
      lifeClass: lifeClass as any,
      avatarConfig: JSON.stringify(avatarConfig),
    });
  };

  const totalSteps = isOwner ? 3 : 4; // owner skips combat class step

  const stepLabels = isOwner
    ? ["角色ID", "生活职业", "形象设计"]
    : ["角色ID", "战斗职业", "生活职业", "形象设计"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d0b1e] via-[#1a1040] to-[#0d0b1e] flex items-center justify-center p-4">
      {/* Stars background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              width: Math.random() * 2 + 1 + "px",
              height: Math.random() * 2 + 1 + "px",
              left: Math.random() * 100 + "%",
              top: Math.random() * 100 + "%",
              animationDelay: Math.random() * 3 + "s",
              opacity: Math.random() * 0.5 + 0.2,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            ✨ 创建你的王国角色
          </h1>
          <p className="text-purple-300 text-sm">
            {isOwner ? "法师大人，请设置您的专属形象" : "选择你的职业，开始在小炮王国的冒险！"}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {stepLabels.map((label, i) => {
            const stepNum = i + 1;
            const actualStep = isOwner && i >= 1 ? i + 2 : stepNum; // owner: step 1=ID, 2=life(skip combat), 3=avatar
            const displayStep = isOwner
              ? (step === 1 ? 1 : step === 3 ? 2 : step === 4 ? 3 : step)
              : step;
            const isActive = displayStep === stepNum;
            const isDone = displayStep > stepNum;
            return (
              <div key={i} className="flex items-center gap-2">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all",
                  isActive ? "bg-purple-600 border-purple-400 text-white" :
                  isDone ? "bg-green-600 border-green-400 text-white" :
                  "bg-purple-900/30 border-purple-700/50 text-purple-400"
                )}>
                  {isDone ? "✓" : stepNum}
                </div>
                <span className={cn("text-xs hidden sm:block", isActive ? "text-purple-200" : "text-purple-500")}>
                  {label}
                </span>
                {i < stepLabels.length - 1 && (
                  <div className={cn("w-8 h-0.5 mx-1", isDone ? "bg-green-500" : "bg-purple-800")} />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-purple-900/30 border border-purple-500/30 rounded-2xl p-6 backdrop-blur-sm">

          {/* Step 1: Nickname / ID */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-5xl mb-3">🏷️</div>
                <h2 className="text-xl font-bold text-white mb-1">设置你的角色ID</h2>
                <p className="text-purple-300 text-sm">这是你在王国中的专属称号，最多20个字</p>
              </div>
              <div className="max-w-sm mx-auto">
                <Input
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="输入你的角色名..."
                  maxLength={20}
                  className="bg-purple-900/50 border-purple-500/50 text-white placeholder:text-purple-400 text-center text-lg h-12"
                />
                <p className="text-xs text-purple-400 text-right mt-1">{nickname.length}/20</p>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    if (!nickname.trim()) { toast.error("请输入角色ID"); return; }
                    setStep(isOwner ? 3 : 2); // owner skips combat class
                  }}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-8"
                >
                  下一步 →
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Combat class (non-owner only) */}
          {step === 2 && !isOwner && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-5xl mb-3">⚔️</div>
                <h2 className="text-xl font-bold text-white mb-1">选择战斗职业</h2>
                <p className="text-purple-300 text-sm">战斗职业一旦选定，不可更改！请慎重选择</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {COMBAT_CLASSES.map(cls => (
                  <button
                    key={cls.id}
                    onClick={() => setCombatClass(cls.id)}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all",
                      combatClass === cls.id
                        ? "bg-purple-600/40 border-purple-400 shadow-lg shadow-purple-500/20"
                        : "bg-purple-900/20 border-purple-700/40 hover:border-purple-500"
                    )}
                  >
                    <div className="text-2xl mb-1">{cls.emoji}</div>
                    <div className="font-bold text-white text-sm">{cls.name}</div>
                    <div className="text-xs text-purple-300 mt-1 leading-relaxed">{cls.desc}</div>
                  </button>
                ))}
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)} className="text-purple-300">← 上一步</Button>
                <Button
                  onClick={() => {
                    if (!combatClass) { toast.error("请选择战斗职业"); return; }
                    // Update avatar config to match class defaults
                    const classOutfits = CLASS_OUTFITS[combatClass];
                    setAvatarConfig(prev => ({
                      ...prev,
                      topStyle: classOutfits.tops[0],
                      bottomStyle: classOutfits.bottoms[0],
                      accessory: classOutfits.accessories[0],
                    }));
                    setStep(3);
                  }}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-8"
                >
                  下一步 →
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Life class */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-5xl mb-3">🏡</div>
                <h2 className="text-xl font-bold text-white mb-1">选择生活职业</h2>
                <p className="text-purple-300 text-sm">生活职业决定你在王国中的日常角色，可以之后更改</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {LIFE_CLASSES.map(cls => (
                  <button
                    key={cls.id}
                    onClick={() => setLifeClass(cls.id)}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all",
                      lifeClass === cls.id
                        ? "bg-purple-600/40 border-purple-400 shadow-lg shadow-purple-500/20"
                        : "bg-purple-900/20 border-purple-700/40 hover:border-purple-500"
                    )}
                  >
                    <div className="text-2xl mb-1">{cls.emoji}</div>
                    <div className="font-bold text-white text-sm">{cls.name}</div>
                    <div className="text-xs text-purple-300 mt-1 leading-relaxed">{cls.desc}</div>
                  </button>
                ))}
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(isOwner ? 1 : 2)} className="text-purple-300">← 上一步</Button>
                <Button
                  onClick={() => {
                    if (!lifeClass) { toast.error("请选择生活职业"); return; }
                    setStep(4);
                  }}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-8"
                >
                  下一步 →
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Avatar customization */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-5xl mb-3">🎨</div>
                <h2 className="text-xl font-bold text-white mb-1">设计你的形象</h2>
                <p className="text-purple-300 text-sm">打造你在王国中的专属像素形象</p>
              </div>
              <AvatarCustomizer
                config={avatarConfig}
                onChange={setAvatarConfig}
                combatClass={isOwner ? "owner" : combatClass}
              />
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(3)} className="text-purple-300">← 上一步</Button>
                <Button
                  onClick={handleFinish}
                  disabled={setupMutation.isPending}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-8 font-bold"
                >
                  {setupMutation.isPending ? "创建中..." : "✨ 进入王国！"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
