import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Sparkles, Mail, Star, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Pixel mountain SVG (bottom decoration like Habitica) ──────────────────────
function PixelMountains() {
  return (
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none select-none">
      <svg
        viewBox="0 0 1440 200"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="w-full"
        style={{ display: "block" }}
      >
        {/* Back mountains (darker) */}
        <polygon
          points="0,200 0,120 60,80 120,110 180,60 240,90 300,40 360,75 420,30 480,65 540,20 600,55 660,25 720,60 780,15 840,50 900,10 960,45 1020,20 1080,55 1140,30 1200,65 1260,35 1320,70 1380,40 1440,75 1440,200"
          fill="#2d1b69"
        />
        {/* Front mountains (lighter) */}
        <polygon
          points="0,200 0,150 80,110 160,140 240,95 320,130 400,85 480,120 560,75 640,115 720,70 800,110 880,65 960,105 1040,60 1120,100 1200,80 1280,115 1360,90 1440,120 1440,200"
          fill="#3b1f7a"
        />
        {/* Foreground mountains (lightest) */}
        <polygon
          points="0,200 0,170 100,145 200,165 300,130 400,155 500,120 600,150 700,115 800,148 900,110 1000,145 1100,125 1200,155 1300,135 1440,160 1440,200"
          fill="#4c2a8a"
        />
        {/* Snow caps on front mountains */}
        <polygon points="560,75 540,90 580,90" fill="#e2d9f3" opacity="0.8" />
        <polygon points="720,70 700,85 740,85" fill="#e2d9f3" opacity="0.8" />
        <polygon points="880,65 860,80 900,80" fill="#e2d9f3" opacity="0.8" />
        <polygon points="1040,60 1020,75 1060,75" fill="#e2d9f3" opacity="0.8" />
        <polygon points="400,85 380,100 420,100" fill="#e2d9f3" opacity="0.6" />
        <polygon points="240,95 220,110 260,110" fill="#e2d9f3" opacity="0.6" />
      </svg>
    </div>
  );
}

// ── Twinkling stars ────────────────────────────────────────────────────────────
function Stars() {
  const stars = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 75,
    size: Math.random() * 2.5 + 0.5,
    delay: Math.random() * 4,
    duration: Math.random() * 2 + 2,
    isCross: Math.random() > 0.6,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        >
          {star.isCross ? (
            <svg
              width={star.size * 8}
              height={star.size * 8}
              viewBox="0 0 10 10"
              className="animate-pulse"
              style={{ animationDelay: `${star.delay}s`, animationDuration: `${star.duration}s` }}
            >
              <line x1="5" y1="0" x2="5" y2="10" stroke="white" strokeWidth="1" opacity="0.8" />
              <line x1="0" y1="5" x2="10" y2="5" stroke="white" strokeWidth="1" opacity="0.8" />
              <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" stroke="white" strokeWidth="0.5" opacity="0.5" />
              <line x1="8.5" y1="1.5" x2="1.5" y2="8.5" stroke="white" strokeWidth="0.5" opacity="0.5" />
            </svg>
          ) : (
            <div
              className="rounded-full bg-white animate-pulse"
              style={{
                width: `${star.size}px`,
                height: `${star.size}px`,
                opacity: Math.random() * 0.5 + 0.3,
                animationDelay: `${star.delay}s`,
                animationDuration: `${star.duration}s`,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Magic Letter component ─────────────────────────────────────────────────────
function MagicLetter({ onClose }: { onClose: () => void }) {
  const [opened, setOpened] = useState(false);

  const handleOpen = () => setOpened(true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="relative max-w-lg w-full"
        style={{ animation: "fadeInScale 0.4s ease-out" }}
      >
        {/* Envelope / Letter card */}
        <div
          className="rounded-2xl p-8 text-center shadow-2xl border border-purple-400/30"
          style={{
            background: "linear-gradient(135deg, #1e0a3c 0%, #2d1b69 50%, #1a0a2e 100%)",
          }}
        >
          {/* Wax seal icon */}
          <div className="flex justify-center mb-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg border-2 border-yellow-400/50"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4c1d95)" }}
            >
              🔮
            </div>
          </div>

          <div className="text-yellow-300 text-sm font-semibold tracking-widest uppercase mb-2 opacity-80">
            ✦ 来自小炮王国的魔法信件 ✦
          </div>

          {!opened ? (
            <>
              <p className="text-purple-200 text-base mb-6 leading-relaxed">
                一封神秘的信件正在等待你开启…
              </p>
              <Button
                onClick={handleOpen}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white border-0 px-8 py-2 rounded-full font-semibold shadow-lg"
              >
                ✨ 开启魔法信件
              </Button>
            </>
          ) : (
            <div style={{ animation: "fadeIn 0.6s ease-out" }}>
              <h2 className="text-2xl font-bold text-white mb-4">
                亲爱的魔法世界居民 ✨
              </h2>
              <div className="text-purple-100 text-sm leading-relaxed space-y-3 text-left bg-white/5 rounded-xl p-5 mb-6">
                <p>
                  欢迎来到<span className="text-yellow-300 font-bold">小炮的魔法世界</span>！🏰
                </p>
                <p>
                  这里是一片充满奇迹的王国，每一位居民都有属于自己的魔法力量。
                  在这里，你可以完成任务、积累魔法金币、解锁专属装扮，
                  与其他居民一起为建设王国贡献力量！
                </p>
                <p>
                  <span className="text-yellow-300">✦ 完成任务</span> → 获得魔法金币<br />
                  <span className="text-yellow-300">✦ 积累金币</span> → 解锁稀有装扮<br />
                  <span className="text-yellow-300">✦ 每日打卡</span> → 连续签到奖励
                </p>
                <p className="text-purple-300 text-xs italic">
                  — 小炮大人亲笔，盖有王国金印 🔮
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="border-purple-400/50 text-purple-200 hover:bg-purple-800/50 rounded-full px-6"
                >
                  关闭
                </Button>
                <Link href="/register">
                  <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white border-0 rounded-full px-6 font-semibold">
                    立即加入王国 →
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Welcome Page ──────────────────────────────────────────────────────────
export default function Welcome() {
  const [showLetter, setShowLetter] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTitleVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center"
      style={{
        background: "linear-gradient(180deg, #1a0533 0%, #2d1069 40%, #3b1f7a 70%, #4c2a8a 100%)",
      }}
    >
      {/* Stars */}
      <Stars />

      {/* Pixel mountains */}
      <PixelMountains />

      {/* Main content */}
      <div
        className="relative z-10 text-center px-6 pb-48"
        style={{
          opacity: titleVisible ? 1 : 0,
          transform: titleVisible ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.8s ease, transform 0.8s ease",
        }}
      >
        {/* Logo / Title */}
        <div className="mb-3 flex justify-center">
          <div className="text-6xl animate-bounce" style={{ animationDuration: "3s" }}>
            🔮
          </div>
        </div>

        <h1
          className="text-5xl md:text-6xl font-black mb-3 tracking-tight"
          style={{
            background: "linear-gradient(135deg, #f9d71c 0%, #ff9a3c 40%, #e879f9 80%, #a78bfa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            textShadow: "none",
            fontFamily: "'Ma Shan Zheng', serif",
          }}
        >
          小炮的魔法世界
        </h1>

        <p className="text-purple-200 text-lg mb-8 opacity-80">
          ✨ 欢迎来到这片充满奇迹的王国 ✨
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Link href="/login">
            <Button
              size="lg"
              className="w-full sm:w-auto rounded-full px-10 font-bold text-base shadow-xl border-0"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                color: "white",
              }}
            >
              🔑 踏入王国
            </Button>
          </Link>
          <Link href="/register">
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto rounded-full px-10 font-bold text-base border-2 border-purple-400/60 text-white hover:bg-purple-800/40 shadow-xl"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              📜 成为居民
            </Button>
          </Link>
        </div>

        {/* Magic letter button */}
        <button
          onClick={() => setShowLetter(true)}
          className="flex items-center gap-2 mx-auto text-purple-300 hover:text-yellow-300 transition-colors text-sm group"
        >
          <Mail className="w-4 h-4 group-hover:animate-bounce" />
          <span>查看来自小炮大人的魔法信件</span>
          <Sparkles className="w-4 h-4 group-hover:animate-spin" />
        </button>

        {/* Feature highlights */}
        <div className="mt-12 grid grid-cols-3 gap-4 max-w-sm mx-auto">
          {[
            { icon: "⚔️", label: "完成副本" },
            { icon: "💰", label: "积累金币" },
            { icon: "🏆", label: "解锁成就" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center gap-1 p-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)" }}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-purple-200 text-xs">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Magic letter modal */}
      {showLetter && <MagicLetter onClose={() => setShowLetter(false)} />}

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
