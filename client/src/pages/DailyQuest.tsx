import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { PixelAvatarDisplay, DEFAULT_AVATAR } from "@/components/PixelAvatar";
import type { AvatarConfig } from "@/components/PixelAvatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Sword, Star, Coins, ChevronRight, RotateCcw, Home } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

// ── Confetti animation ───────────────────────────────────────────────────────
function Confetti({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-3 h-3 rounded-sm animate-bounce"
          style={{
            left: Math.random() * 100 + "%",
            top: -20,
            backgroundColor: ["#f59e0b", "#8b5cf6", "#ec4899", "#10b981", "#3b82f6"][i % 5],
            animationDelay: Math.random() * 1 + "s",
            animationDuration: Math.random() * 1 + 1.5 + "s",
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}

// ── Typing text effect ────────────────────────────────────────────────────────
function TypingText({ text, speed = 30 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        setDone(true);
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && <span className="animate-pulse">▌</span>}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DailyQuest() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [showConfetti, setShowConfetti] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  const { data: profileData, isLoading: profileLoading } = trpc.rpg.getProfile.useQuery();
  const { data: quest, isLoading: questLoading, refetch: refetchQuest } = trpc.rpg.getTodayQuest.useQuery();

  const generateMutation = trpc.rpg.generateTodayQuest.useMutation({
    onSuccess: () => refetchQuest(),
    onError: (err) => toast.error(err.message),
  });

  const choiceMutation = trpc.rpg.submitChoice.useMutation({
    onSuccess: () => refetchQuest(),
    onError: (err) => toast.error(err.message),
  });

  const claimMutation = trpc.rpg.claimReward.useMutation({
    onSuccess: (data) => {
      setRewardClaimed(true);
      setShowConfetti(true);
      toast.success(`🎉 获得 ${data.expGained} EXP + ${data.coinsGained} 金币！`);
      utils.rpg.getProfile.invalidate();
      setTimeout(() => setShowConfetti(false), 4000);
      refetchQuest();
    },
    onError: (err) => toast.error(err.message),
  });

  const profile = profileData?.profile;
  const avatarConfig: AvatarConfig = profile?.avatarConfig
    ? JSON.parse(profile.avatarConfig)
    : DEFAULT_AVATAR;

  // Redirect if no profile
  useEffect(() => {
    if (!profileLoading && !profile) {
      navigate("/character-setup");
    }
  }, [profileLoading, profile]);

  const choices: Array<{ id: string; text: string; effect: string; expReward: number; coinReward: number }> =
    quest?.choices ? JSON.parse(quest.choices) : [];

  const isLoading = profileLoading || questLoading;

  return (
    <DashboardLayout>
      <Confetti active={showConfetti} />

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sword className="w-6 h-6 text-purple-400" />
              今日冒险
            </h1>
            <p className="text-purple-300 text-sm mt-1">
              {new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
            </p>
          </div>
          {profile && (
            <div className="flex items-center gap-3 bg-purple-900/40 border border-purple-500/30 rounded-xl px-4 py-2">
              <PixelAvatarDisplay config={avatarConfig} size="sm" />
              <div>
                <div className="text-white font-bold text-sm">{profile.nickname}</div>
                <div className="text-purple-300 text-xs">Lv.{profile.level} · {profile.exp} EXP</div>
              </div>
            </div>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="bg-purple-900/30 border border-purple-500/30 rounded-2xl p-12 text-center">
            <div className="text-4xl animate-spin mb-4">⚔️</div>
            <p className="text-purple-300">加载冒险中...</p>
          </div>
        )}

        {/* No quest yet */}
        {!isLoading && !quest && (
          <div className="bg-purple-900/30 border border-purple-500/30 rounded-2xl p-12 text-center space-y-4">
            <div className="text-6xl">🌅</div>
            <h2 className="text-xl font-bold text-white">新的一天，新的冒险！</h2>
            <p className="text-purple-300 text-sm">
              今日的冒险任务尚未开始，点击下方按钮让 AI 为你生成今日剧情
            </p>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-8 py-3 text-base font-bold"
            >
              {generateMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⚔️</span> AI 正在生成剧情...
                </span>
              ) : (
                "⚔️ 开始今日冒险！"
              )}
            </Button>
          </div>
        )}

        {/* Quest in progress */}
        {!isLoading && quest && (
          <div className="space-y-4">
            {/* Story text */}
            <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border border-purple-500/30 rounded-2xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="text-2xl">📜</div>
                <div>
                  <div className="text-xs text-purple-400 font-medium mb-1">今日剧情</div>
                  <p className="text-white leading-relaxed text-sm">
                    {quest.storyText ? <TypingText text={quest.storyText} speed={20} /> : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Choices */}
            {quest.stage === "choice" && choices.length > 0 && (
              <div className="space-y-3">
                <div className="text-purple-300 text-sm font-medium flex items-center gap-2">
                  <ChevronRight className="w-4 h-4" />
                  你会怎么做？
                </div>
                {choices.map((choice) => (
                  <button
                    key={choice.id}
                    onClick={() => choiceMutation.mutate({ questId: quest.id, choiceId: choice.id })}
                    disabled={choiceMutation.isPending}
                    className={cn(
                      "w-full p-4 rounded-xl border-2 text-left transition-all group",
                      "bg-purple-900/30 border-purple-700/40 hover:border-purple-400 hover:bg-purple-800/40",
                      choiceMutation.isPending && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-white text-sm group-hover:text-purple-200 transition-colors">
                          [{choice.id}] {choice.text}
                        </div>
                        <div className="text-xs text-purple-400 mt-1">{choice.effect}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs text-yellow-400 flex items-center gap-1">
                          <Star className="w-3 h-3" /> +{choice.expReward} EXP
                        </span>
                        {choice.coinReward > 0 && (
                          <span className="text-xs text-amber-400 flex items-center gap-1">
                            🪙 +{choice.coinReward}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
                {choiceMutation.isPending && (
                  <div className="text-center text-purple-400 text-sm animate-pulse">
                    ✨ AI 正在生成结局...
                  </div>
                )}
              </div>
            )}

            {/* Outcome */}
            {(quest.stage === "outcome" || quest.stage === "completed") && quest.outcomeText && (
              <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 rounded-2xl p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="text-2xl">⚡</div>
                  <div>
                    <div className="text-xs text-indigo-400 font-medium mb-1">冒险结果</div>
                    <p className="text-white leading-relaxed text-sm">
                      <TypingText text={quest.outcomeText} speed={25} />
                    </p>
                  </div>
                </div>

                {/* Rewards */}
                <div className="flex items-center gap-4 mt-4 p-3 bg-black/20 rounded-xl">
                  <div className="text-sm text-purple-300">本次收获：</div>
                  <div className="flex items-center gap-1 text-yellow-400 text-sm font-bold">
                    <Star className="w-4 h-4" /> +{quest.expReward} EXP
                  </div>
                  {(quest.coinReward ?? 0) > 0 && (
                    <div className="flex items-center gap-1 text-amber-400 text-sm font-bold">
                      🪙 +{quest.coinReward} 金币
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Claim reward button */}
            {quest.stage === "outcome" && !quest.rewardClaimed && (
              <Button
                onClick={() => claimMutation.mutate({ questId: quest.id })}
                disabled={claimMutation.isPending}
                className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-bold py-3 text-base"
              >
                {claimMutation.isPending ? "领取中..." : "🎁 领取冒险奖励！"}
              </Button>
            )}

            {/* Completed */}
            {quest.stage === "completed" && quest.rewardClaimed && (
              <div className="bg-green-900/30 border border-green-500/30 rounded-2xl p-6 text-center">
                <div className="text-4xl mb-2">🏆</div>
                <h3 className="text-white font-bold text-lg mb-1">今日冒险完成！</h3>
                <p className="text-green-300 text-sm">明天再来继续你的王国传说～</p>
                <Button
                  onClick={() => navigate("/tavern")}
                  variant="outline"
                  className="mt-4 border-green-500/50 text-green-300 hover:bg-green-900/30"
                >
                  <Home className="w-4 h-4 mr-2" />
                  前往魔法酒馆
                </Button>
              </div>
            )}

            {/* Owner special: completed immediately */}
            {quest.stage === "completed" && !quest.rewardClaimed && (
              <div className="bg-purple-900/30 border border-purple-500/30 rounded-2xl p-6 text-center">
                <div className="text-4xl mb-2">👑</div>
                <h3 className="text-white font-bold text-lg mb-1">法师大人的日常记录</h3>
                <p className="text-purple-300 text-sm">今日的王国事务已记录在册</p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
