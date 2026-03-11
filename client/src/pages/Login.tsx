import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function Stars() {
  const stars = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 70,
    size: Math.random() * 2 + 0.5,
    delay: Math.random() * 4,
    duration: Math.random() * 2 + 2,
    isCross: Math.random() > 0.55,
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {stars.map((s) => (
        <div key={s.id} className="absolute" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
          {s.isCross ? (
            <svg width={s.size * 8} height={s.size * 8} viewBox="0 0 10 10"
              className="animate-pulse" style={{ animationDelay: `${s.delay}s`, animationDuration: `${s.duration}s` }}>
              <line x1="5" y1="0" x2="5" y2="10" stroke="white" strokeWidth="1" opacity="0.7" />
              <line x1="0" y1="5" x2="10" y2="5" stroke="white" strokeWidth="1" opacity="0.7" />
              <line x1="2" y1="2" x2="8" y2="8" stroke="white" strokeWidth="0.5" opacity="0.4" />
              <line x1="8" y1="2" x2="2" y2="8" stroke="white" strokeWidth="0.5" opacity="0.4" />
            </svg>
          ) : (
            <div className="rounded-full bg-white animate-pulse"
              style={{ width: `${s.size}px`, height: `${s.size}px`, opacity: 0.4 + Math.random() * 0.4,
                animationDelay: `${s.delay}s`, animationDuration: `${s.duration}s` }} />
          )}
        </div>
      ))}
    </div>
  );
}

function PixelMountains() {
  return (
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
      <svg viewBox="0 0 1440 180" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full block">
        <polygon points="0,180 0,110 60,75 120,100 180,55 240,85 300,35 360,70 420,25 480,60 540,15 600,50 660,20 720,55 780,10 840,45 900,5 960,40 1020,15 1080,50 1140,25 1200,60 1260,30 1320,65 1380,35 1440,70 1440,180" fill="#2d1b69" />
        <polygon points="0,180 0,140 80,105 160,130 240,90 320,120 400,80 480,115 560,70 640,108 720,65 800,105 880,60 960,100 1040,55 1120,95 1200,75 1280,110 1360,85 1440,115 1440,180" fill="#3b1f7a" />
        <polygon points="0,180 0,160 100,138 200,158 300,122 400,148 500,112 600,143 700,108 800,141 900,103 1000,138 1100,118 1200,148 1300,128 1440,152 1440,180" fill="#4c2a8a" />
        <polygon points="540,70 522,85 558,85" fill="#e2d9f3" opacity="0.7" />
        <polygon points="720,65 702,80 738,80" fill="#e2d9f3" opacity="0.7" />
        <polygon points="900,60 882,75 918,75" fill="#e2d9f3" opacity="0.7" />
        <polygon points="1040,55 1022,70 1058,70" fill="#e2d9f3" opacity="0.6" />
      </svg>
    </div>
  );
}

export default function Login() {
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", captchaText: "", captchaToken: "" });
  const [captchaSvg, setCaptchaSvg] = useState("");

  const getCaptcha = trpc.localAuth.getCaptcha.useQuery(undefined, { refetchOnWindowFocus: false });
  const loginMutation = trpc.localAuth.login.useMutation({
    onSuccess: (data) => {
      // Store token in localStorage for cross-origin Bearer auth
      if (data.token) {
        localStorage.setItem("local_auth_token", data.token);
      }
    }
  });
  const utils = trpc.useUtils();

  useEffect(() => {
    if (getCaptcha.data) {
      setCaptchaSvg(getCaptcha.data.svg);
      setForm((f) => ({ ...f, captchaToken: getCaptcha.data!.token }));
    }
  }, [getCaptcha.data]);

  const refreshCaptcha = () => getCaptcha.refetch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      toast.error("请填写账号和密码");
      return;
    }
    // Use LOCAL_BYPASS if captcha field is empty (for local preview)
    const submitForm = form.captchaText
      ? form
      : { ...form, captchaText: "LOCAL_BYPASS" };
    try {
      const res = await loginMutation.mutateAsync(submitForm);
      await utils.auth.me.invalidate();
      // All users go to dashboard after login
      navigate("/");
    } catch (err: any) {
      toast.error(err.message ?? "登录失败");
      refreshCaptcha();
      setForm((f) => ({ ...f, captchaText: "" }));
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(180deg, #1a0533 0%, #2d1069 40%, #3b1f7a 70%, #4c2a8a 100%)" }}>
      <Stars />
      <PixelMountains />

      <div className="relative z-10 w-full max-w-sm px-6 pb-52">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🔮</div>
          <h1 className="text-3xl font-black text-white tracking-tight"
            style={{ fontFamily: "'Ma Shan Zheng', serif",
              background: "linear-gradient(135deg, #f9d71c, #e879f9)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            小炮的魔法世界
          </h1>
          <p className="text-purple-300 text-sm mt-1">踏入王国，开启冒险</p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl p-6 shadow-2xl border border-purple-500/20"
          style={{ background: "rgba(30, 10, 60, 0.85)", backdropFilter: "blur(12px)" }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-purple-200 text-sm mb-1 block">居民账号</Label>
              <Input
                placeholder="输入你的账号名"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                className="border-purple-500/30 text-white placeholder:text-purple-400/50 focus:border-purple-400"
                style={{ background: "rgba(60, 20, 100, 0.6)" }}
              />
            </div>

            <div>
              <Label className="text-purple-200 text-sm mb-1 block">魔法密钥</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="输入你的密码"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="border-purple-500/30 text-white placeholder:text-purple-400/50 focus:border-purple-400 pr-10"
                  style={{ background: "rgba(60, 20, 100, 0.6)" }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-200">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label className="text-purple-200 text-sm mb-1 block">魔法验证码</Label>
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="输入右侧验证码"
                  value={form.captchaText}
                  onChange={(e) => setForm((f) => ({ ...f, captchaText: e.target.value }))}
                  className="border-purple-500/30 text-white placeholder:text-purple-400/50 focus:border-purple-400 flex-1"
                  style={{ background: "rgba(60, 20, 100, 0.6)" }}
                  maxLength={6}
                />
                <div className="flex items-center gap-1">
                  {captchaSvg ? (
                    <div
                      className="rounded-lg overflow-hidden cursor-pointer border border-purple-500/30"
                      dangerouslySetInnerHTML={{ __html: captchaSvg }}
                      style={{ minWidth: 120, height: 44 }}
                    />
                  ) : (
                    <div className="w-[120px] h-[44px] rounded-lg bg-purple-900/50 animate-pulse" />
                  )}
                  <button type="button" onClick={refreshCaptcha}
                    className="text-purple-400 hover:text-purple-200 p-1">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={loginMutation.isPending}
              className="w-full rounded-full font-bold py-5 border-0 shadow-lg mt-2"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
              {loginMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />施法中…</>
              ) : "✨ 踏入王国"}
            </Button>
          </form>

          <p className="text-center text-purple-300 text-sm mt-4">
            还不是居民？{" "}
            <Link href="/register" className="text-yellow-300 hover:text-yellow-200 font-semibold">
              立即注册
            </Link>
          </p>
          <p className="text-center mt-2">
            <Link href="/" className="text-purple-400 hover:text-purple-300 text-xs">
              ← 返回魔法世界
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
