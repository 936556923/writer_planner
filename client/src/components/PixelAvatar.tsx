/**
 * PixelAvatar — CSS-based layered pixel character customizer
 * Layers: body (gender) → hair → top → bottom → accessory
 * Each combat class unlocks different outfit styles.
 */

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

export type Gender = "female" | "male";
export type HairStyle = "short" | "long" | "ponytail" | "bun" | "spiky" | "braids";
export type HairColor = "black" | "brown" | "blonde" | "red" | "purple" | "white" | "blue";
export type TopStyle = "robe" | "armor" | "leather" | "hunter" | "holy" | "dark" | "casual" | "beggar_top";
export type BottomStyle = "robe_bottom" | "plate_legs" | "leather_pants" | "hunter_pants" | "holy_skirt" | "dark_pants" | "casual_pants" | "beggar_pants";
export type AccessoryStyle = "none" | "magic_hat" | "helmet" | "hood" | "feather_hat" | "halo" | "skull_crown" | "flower" | "staff" | "bow" | "shield" | "dagger";
export type SkinColor = "light" | "tan" | "dark";

export interface AvatarConfig {
  gender: Gender;
  hairStyle: HairStyle;
  hairColor: HairColor;
  topStyle: TopStyle;
  bottomStyle: BottomStyle;
  accessory: AccessoryStyle;
  skinColor: SkinColor;
  primaryColor: string;  // hex
  secondaryColor: string; // hex
}

export const DEFAULT_AVATAR: AvatarConfig = {
  gender: "female",
  hairStyle: "long",
  hairColor: "black",
  topStyle: "robe",
  bottomStyle: "robe_bottom",
  accessory: "magic_hat",
  skinColor: "light",
  primaryColor: "#7c3aed",
  secondaryColor: "#f59e0b",
};

// Combat class → allowed outfit styles
export const CLASS_OUTFITS: Record<string, { tops: TopStyle[]; bottoms: BottomStyle[]; accessories: AccessoryStyle[] }> = {
  owner:       { tops: ["robe", "casual"], bottoms: ["robe_bottom", "casual_pants"], accessories: ["magic_hat", "staff", "flower", "none"] },
  mage:        { tops: ["robe", "casual"], bottoms: ["robe_bottom", "casual_pants"], accessories: ["magic_hat", "staff", "none"] },
  warrior:     { tops: ["armor", "casual"], bottoms: ["plate_legs", "casual_pants"], accessories: ["helmet", "shield", "none"] },
  rogue:       { tops: ["leather", "casual"], bottoms: ["leather_pants", "casual_pants"], accessories: ["hood", "dagger", "none"] },
  archer:      { tops: ["hunter", "casual"], bottoms: ["hunter_pants", "casual_pants"], accessories: ["feather_hat", "bow", "none"] },
  paladin:     { tops: ["holy", "armor"], bottoms: ["holy_skirt", "plate_legs"], accessories: ["halo", "shield", "helmet", "none"] },
  necromancer: { tops: ["dark", "robe"], bottoms: ["dark_pants", "robe_bottom"], accessories: ["skull_crown", "staff", "hood", "none"] },
  beggar:      { tops: ["beggar_top", "casual"], bottoms: ["beggar_pants", "casual_pants"], accessories: ["none", "flower"] },
};

// Skin color values
const SKIN_COLORS: Record<SkinColor, { face: string; body: string }> = {
  light: { face: "#fde8c8", body: "#f5d5a0" },
  tan:   { face: "#d4a574", body: "#c4956a" },
  dark:  { face: "#8b5e3c", body: "#7a5230" },
};

// Hair color values
const HAIR_COLORS: Record<HairColor, string> = {
  black:  "#1a1a1a",
  brown:  "#6b3a2a",
  blonde: "#f0c040",
  red:    "#c0392b",
  purple: "#8b5cf6",
  white:  "#f0f0f0",
  blue:   "#3b82f6",
};

interface PixelAvatarDisplayProps {
  config: AvatarConfig;
  size?: "sm" | "md" | "lg" | "xl";
  animated?: boolean;
  action?: string; // tavern action label
}

export function PixelAvatarDisplay({ config, size = "md", animated = false, action }: PixelAvatarDisplayProps) {
  const sizeMap = { sm: 48, md: 80, lg: 120, xl: 160 };
  const px = sizeMap[size];
  const skin = SKIN_COLORS[config.skinColor];
  const hairColor = HAIR_COLORS[config.hairColor];
  const primary = config.primaryColor;
  const secondary = config.secondaryColor;

  // Scale factor for pixel art
  const scale = px / 80;

  return (
    <div
      className={cn("relative inline-block select-none", animated && "animate-bounce")}
      style={{ width: px, height: px }}
      title={action}
    >
      <svg
        viewBox="0 0 32 40"
        width={px}
        height={px}
        style={{ imageRendering: "pixelated" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ── Body / Torso ── */}
        <rect x="11" y="18" width="10" height="10" fill={primary} />
        {/* Arms */}
        <rect x="8" y="18" width="3" height="8" fill={primary} />
        <rect x="21" y="18" width="3" height="8" fill={primary} />
        {/* Hands */}
        <rect x="8" y="26" width="3" height="2" fill={skin.body} />
        <rect x="21" y="26" width="3" height="2" fill={skin.body} />

        {/* ── Legs / Bottom ── */}
        {config.bottomStyle === "robe_bottom" || config.bottomStyle === "holy_skirt" ? (
          // Robe/skirt — full width
          <>
            <rect x="10" y="28" width="12" height="8" fill={secondary} />
            <rect x="10" y="35" width="5" height="3" fill={secondary} />
            <rect x="17" y="35" width="5" height="3" fill={secondary} />
          </>
        ) : config.bottomStyle === "plate_legs" ? (
          <>
            <rect x="11" y="28" width="4" height="9" fill="#94a3b8" />
            <rect x="17" y="28" width="4" height="9" fill="#94a3b8" />
            <rect x="11" y="36" width="4" height="2" fill="#64748b" />
            <rect x="17" y="36" width="4" height="2" fill="#64748b" />
          </>
        ) : config.bottomStyle === "beggar_pants" ? (
          <>
            <rect x="11" y="28" width="4" height="9" fill="#92400e" />
            <rect x="17" y="28" width="4" height="9" fill="#78350f" />
            {/* Patches */}
            <rect x="12" y="31" width="2" height="2" fill="#a16207" />
          </>
        ) : (
          // Default pants
          <>
            <rect x="11" y="28" width="4" height="9" fill={secondary} />
            <rect x="17" y="28" width="4" height="9" fill={secondary} />
            <rect x="11" y="36" width="4" height="2" fill={primary} />
            <rect x="17" y="36" width="4" height="2" fill={primary} />
          </>
        )}

        {/* ── Neck ── */}
        <rect x="14" y="15" width="4" height="3" fill={skin.face} />

        {/* ── Head ── */}
        <rect x="11" y="6" width="10" height="10" fill={skin.face} />
        {/* Eyes */}
        <rect x="13" y="9" width="2" height="2" fill="#1a1a1a" />
        <rect x="17" y="9" width="2" height="2" fill="#1a1a1a" />
        {/* Mouth */}
        <rect x="14" y="13" width="4" height="1" fill="#c0392b" />
        {/* Blush (female) */}
        {config.gender === "female" && (
          <>
            <rect x="12" y="11" width="2" height="1" fill="#f9a8d4" opacity="0.7" />
            <rect x="18" y="11" width="2" height="1" fill="#f9a8d4" opacity="0.7" />
          </>
        )}

        {/* ── Hair ── */}
        {/* Base hair color on top of head */}
        <rect x="11" y="4" width="10" height="4" fill={hairColor} />
        {config.hairStyle === "long" && (
          <>
            <rect x="9" y="6" width="2" height="12" fill={hairColor} />
            <rect x="21" y="6" width="2" height="12" fill={hairColor} />
            <rect x="10" y="16" width="2" height="4" fill={hairColor} />
            <rect x="20" y="16" width="2" height="4" fill={hairColor} />
          </>
        )}
        {config.hairStyle === "ponytail" && (
          <>
            <rect x="9" y="6" width="2" height="6" fill={hairColor} />
            <rect x="21" y="6" width="2" height="6" fill={hairColor} />
            <rect x="21" y="8" width="3" height="10" fill={hairColor} />
          </>
        )}
        {config.hairStyle === "bun" && (
          <>
            <rect x="13" y="2" width="6" height="4" fill={hairColor} />
            <rect x="14" y="1" width="4" height="2" fill={hairColor} />
          </>
        )}
        {config.hairStyle === "spiky" && (
          <>
            <rect x="11" y="3" width="2" height="3" fill={hairColor} />
            <rect x="14" y="2" width="2" height="4" fill={hairColor} />
            <rect x="17" y="3" width="2" height="3" fill={hairColor} />
            <rect x="20" y="4" width="2" height="2" fill={hairColor} />
          </>
        )}
        {config.hairStyle === "braids" && (
          <>
            <rect x="9" y="6" width="2" height="14" fill={hairColor} />
            <rect x="21" y="6" width="2" height="14" fill={hairColor} />
            <rect x="9" y="10" width="2" height="1" fill={secondary} />
            <rect x="21" y="10" width="2" height="1" fill={secondary} />
            <rect x="9" y="14" width="2" height="1" fill={secondary} />
            <rect x="21" y="14" width="2" height="1" fill={secondary} />
          </>
        )}
        {/* short — no extra elements, just the base */}

        {/* ── Outfit top overlay ── */}
        {config.topStyle === "armor" && (
          <>
            {/* Shoulder pads */}
            <rect x="8" y="17" width="4" height="3" fill="#94a3b8" />
            <rect x="20" y="17" width="4" height="3" fill="#94a3b8" />
            {/* Chest plate */}
            <rect x="12" y="18" width="8" height="6" fill="#cbd5e1" />
            <rect x="14" y="19" width="4" height="4" fill="#64748b" />
          </>
        )}
        {config.topStyle === "leather" && (
          <>
            <rect x="9" y="17" width="3" height="3" fill="#92400e" />
            <rect x="20" y="17" width="3" height="3" fill="#92400e" />
            <rect x="12" y="18" width="8" height="6" fill="#a16207" />
          </>
        )}
        {config.topStyle === "hunter" && (
          <>
            <rect x="9" y="17" width="3" height="3" fill="#166534" />
            <rect x="20" y="17" width="3" height="3" fill="#166534" />
            <rect x="12" y="18" width="8" height="6" fill="#15803d" />
          </>
        )}
        {config.topStyle === "holy" && (
          <>
            <rect x="9" y="17" width="3" height="3" fill="#fef3c7" />
            <rect x="20" y="17" width="3" height="3" fill="#fef3c7" />
            <rect x="12" y="18" width="8" height="6" fill="#fef9c3" />
            <rect x="15" y="19" width="2" height="4" fill="#f59e0b" />
          </>
        )}
        {config.topStyle === "dark" && (
          <>
            <rect x="9" y="17" width="3" height="3" fill="#1e1b4b" />
            <rect x="20" y="17" width="3" height="3" fill="#1e1b4b" />
            <rect x="12" y="18" width="8" height="6" fill="#312e81" />
            <rect x="14" y="19" width="4" height="4" fill="#4c1d95" />
          </>
        )}
        {config.topStyle === "beggar_top" && (
          <>
            <rect x="12" y="18" width="8" height="6" fill="#78350f" />
            {/* Torn patches */}
            <rect x="13" y="20" width="2" height="2" fill="#92400e" />
            <rect x="18" y="19" width="2" height="2" fill="#a16207" />
          </>
        )}

        {/* ── Accessories ── */}
        {config.accessory === "magic_hat" && (
          <>
            <rect x="12" y="1" width="8" height="5" fill={primary} />
            <rect x="10" y="5" width="12" height="2" fill={primary} />
            <rect x="14" y="0" width="4" height="2" fill={secondary} />
          </>
        )}
        {config.accessory === "helmet" && (
          <>
            <rect x="11" y="4" width="10" height="6" fill="#94a3b8" />
            <rect x="13" y="8" width="6" height="2" fill="#64748b" />
          </>
        )}
        {config.accessory === "hood" && (
          <>
            <rect x="9" y="5" width="14" height="8" fill="#1e1b4b" opacity="0.85" />
            <rect x="11" y="4" width="10" height="3" fill="#1e1b4b" />
          </>
        )}
        {config.accessory === "feather_hat" && (
          <>
            <rect x="10" y="5" width="12" height="2" fill="#166534" />
            <rect x="20" y="2" width="2" height="5" fill="#bbf7d0" />
            <rect x="21" y="1" width="1" height="2" fill="#86efac" />
          </>
        )}
        {config.accessory === "halo" && (
          <ellipse cx="16" cy="4" rx="5" ry="2" fill="none" stroke={secondary} strokeWidth="1.5" />
        )}
        {config.accessory === "skull_crown" && (
          <>
            <rect x="11" y="4" width="10" height="2" fill="#1a1a1a" />
            <rect x="12" y="2" width="2" height="3" fill="#1a1a1a" />
            <rect x="16" y="1" width="2" height="4" fill="#1a1a1a" />
            <rect x="20" y="2" width="2" height="3" fill="#1a1a1a" />
          </>
        )}
        {config.accessory === "flower" && (
          <>
            <rect x="19" y="5" width="2" height="2" fill="#f9a8d4" />
            <rect x="20" y="4" width="2" height="2" fill="#f9a8d4" />
            <rect x="20" y="5" width="2" height="2" fill="#fbbf24" />
          </>
        )}
        {config.accessory === "staff" && (
          <>
            <rect x="6" y="10" width="2" height="20" fill="#92400e" />
            <rect x="5" y="8" width="4" height="4" fill={primary} />
            <rect x="6" y="7" width="2" height="2" fill={secondary} />
          </>
        )}
        {config.accessory === "bow" && (
          <>
            <rect x="24" y="12" width="2" height="14" fill="#92400e" />
            <rect x="24" y="12" width="4" height="2" fill="#92400e" />
            <rect x="24" y="24" width="4" height="2" fill="#92400e" />
          </>
        )}
        {config.accessory === "shield" && (
          <>
            <rect x="6" y="18" width="5" height="7" fill="#94a3b8" />
            <rect x="7" y="19" width="3" height="5" fill="#64748b" />
            <rect x="8" y="20" width="1" height="3" fill="#f59e0b" />
          </>
        )}
        {config.accessory === "dagger" && (
          <>
            <rect x="24" y="20" width="2" height="8" fill="#94a3b8" />
            <rect x="23" y="19" width="4" height="2" fill="#92400e" />
          </>
        )}

        {/* ── Feet ── */}
        <rect x="11" y="37" width="4" height="2" fill="#1a1a1a" />
        <rect x="17" y="37" width="4" height="2" fill="#1a1a1a" />
      </svg>

      {/* Action label */}
      {action && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-purple-300 font-medium">
          {action}
        </div>
      )}
    </div>
  );
}

// ── Avatar Customizer Panel ─────────────────────────────────────────────────

interface AvatarCustomizerProps {
  config: AvatarConfig;
  onChange: (config: AvatarConfig) => void;
  combatClass?: string;
}

const HAIR_STYLES: { value: HairStyle; label: string }[] = [
  { value: "short",    label: "短发" },
  { value: "long",     label: "长发" },
  { value: "ponytail", label: "马尾" },
  { value: "bun",      label: "丸子头" },
  { value: "spiky",    label: "刺猬头" },
  { value: "braids",   label: "双辫" },
];

const HAIR_COLOR_OPTIONS: { value: HairColor; label: string; color: string }[] = [
  { value: "black",  label: "黑色", color: "#1a1a1a" },
  { value: "brown",  label: "棕色", color: "#6b3a2a" },
  { value: "blonde", label: "金色", color: "#f0c040" },
  { value: "red",    label: "红色", color: "#c0392b" },
  { value: "purple", label: "紫色", color: "#8b5cf6" },
  { value: "white",  label: "白色", color: "#d1d5db" },
  { value: "blue",   label: "蓝色", color: "#3b82f6" },
];

const SKIN_OPTIONS: { value: SkinColor; label: string; color: string }[] = [
  { value: "light", label: "白皙", color: "#fde8c8" },
  { value: "tan",   label: "小麦", color: "#d4a574" },
  { value: "dark",  label: "深色", color: "#8b5e3c" },
];

const TOP_LABELS: Record<TopStyle, string> = {
  robe: "法袍", armor: "铠甲", leather: "皮甲", hunter: "猎装",
  holy: "圣袍", dark: "暗袍", casual: "便服", beggar_top: "破衣",
};
const BOTTOM_LABELS: Record<BottomStyle, string> = {
  robe_bottom: "长袍裙", plate_legs: "板甲腿", leather_pants: "皮裤",
  hunter_pants: "猎裤", holy_skirt: "圣裙", dark_pants: "暗裤",
  casual_pants: "便裤", beggar_pants: "破裤",
};
const ACCESSORY_LABELS: Record<AccessoryStyle, string> = {
  none: "无", magic_hat: "魔法帽", helmet: "头盔", hood: "兜帽",
  feather_hat: "羽毛帽", halo: "光环", skull_crown: "骷髅冠",
  flower: "小花", staff: "法杖", bow: "弓", shield: "盾牌", dagger: "匕首",
};

export function AvatarCustomizer({ config, onChange, combatClass = "mage" }: AvatarCustomizerProps) {
  const allowed = CLASS_OUTFITS[combatClass] ?? CLASS_OUTFITS.mage;

  const set = <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="flex gap-6 flex-wrap">
      {/* Preview */}
      <div className="flex flex-col items-center gap-3">
        <div className="bg-gradient-to-b from-purple-900/60 to-indigo-900/60 rounded-2xl p-6 border border-purple-500/30">
          <PixelAvatarDisplay config={config} size="xl" />
        </div>
        <p className="text-xs text-purple-300">实时预览</p>
      </div>

      {/* Controls */}
      <div className="flex-1 min-w-60 space-y-4">
        {/* Gender */}
        <div>
          <label className="text-xs text-purple-300 font-medium mb-1 block">性别</label>
          <div className="flex gap-2">
            {(["female", "male"] as Gender[]).map(g => (
              <button
                key={g}
                onClick={() => set("gender", g)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
                  config.gender === g
                    ? "bg-purple-600 border-purple-400 text-white"
                    : "bg-purple-900/30 border-purple-700/50 text-purple-300 hover:border-purple-500"
                )}
              >
                {g === "female" ? "👧 女生" : "👦 男生"}
              </button>
            ))}
          </div>
        </div>

        {/* Skin */}
        <div>
          <label className="text-xs text-purple-300 font-medium mb-1 block">肤色</label>
          <div className="flex gap-2">
            {SKIN_OPTIONS.map(s => (
              <button
                key={s.value}
                onClick={() => set("skinColor", s.value)}
                title={s.label}
                className={cn(
                  "w-8 h-8 rounded-full border-2 transition-all",
                  config.skinColor === s.value ? "border-white scale-110" : "border-transparent hover:border-purple-400"
                )}
                style={{ backgroundColor: s.color }}
              />
            ))}
          </div>
        </div>

        {/* Hair style */}
        <div>
          <label className="text-xs text-purple-300 font-medium mb-1 block">发型</label>
          <div className="flex flex-wrap gap-1.5">
            {HAIR_STYLES.map(h => (
              <button
                key={h.value}
                onClick={() => set("hairStyle", h.value)}
                className={cn(
                  "px-2 py-1 rounded text-xs border transition-all",
                  config.hairStyle === h.value
                    ? "bg-purple-600 border-purple-400 text-white"
                    : "bg-purple-900/30 border-purple-700/50 text-purple-300 hover:border-purple-500"
                )}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>

        {/* Hair color */}
        <div>
          <label className="text-xs text-purple-300 font-medium mb-1 block">发色</label>
          <div className="flex gap-2 flex-wrap">
            {HAIR_COLOR_OPTIONS.map(h => (
              <button
                key={h.value}
                onClick={() => set("hairColor", h.value)}
                title={h.label}
                className={cn(
                  "w-7 h-7 rounded-full border-2 transition-all",
                  config.hairColor === h.value ? "border-white scale-110" : "border-transparent hover:border-purple-400"
                )}
                style={{ backgroundColor: h.color }}
              />
            ))}
          </div>
        </div>

        {/* Top */}
        <div>
          <label className="text-xs text-purple-300 font-medium mb-1 block">上衣</label>
          <div className="flex flex-wrap gap-1.5">
            {allowed.tops.map(t => (
              <button
                key={t}
                onClick={() => set("topStyle", t)}
                className={cn(
                  "px-2 py-1 rounded text-xs border transition-all",
                  config.topStyle === t
                    ? "bg-purple-600 border-purple-400 text-white"
                    : "bg-purple-900/30 border-purple-700/50 text-purple-300 hover:border-purple-500"
                )}
              >
                {TOP_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div>
          <label className="text-xs text-purple-300 font-medium mb-1 block">下装</label>
          <div className="flex flex-wrap gap-1.5">
            {allowed.bottoms.map(b => (
              <button
                key={b}
                onClick={() => set("bottomStyle", b)}
                className={cn(
                  "px-2 py-1 rounded text-xs border transition-all",
                  config.bottomStyle === b
                    ? "bg-purple-600 border-purple-400 text-white"
                    : "bg-purple-900/30 border-purple-700/50 text-purple-300 hover:border-purple-500"
                )}
              >
                {BOTTOM_LABELS[b]}
              </button>
            ))}
          </div>
        </div>

        {/* Accessory */}
        <div>
          <label className="text-xs text-purple-300 font-medium mb-1 block">装饰</label>
          <div className="flex flex-wrap gap-1.5">
            {allowed.accessories.map(a => (
              <button
                key={a}
                onClick={() => set("accessory", a)}
                className={cn(
                  "px-2 py-1 rounded text-xs border transition-all",
                  config.accessory === a
                    ? "bg-purple-600 border-purple-400 text-white"
                    : "bg-purple-900/30 border-purple-700/50 text-purple-300 hover:border-purple-500"
                )}
              >
                {ACCESSORY_LABELS[a]}
              </button>
            ))}
          </div>
        </div>

        {/* Primary color */}
        <div className="flex gap-4">
          <div>
            <label className="text-xs text-purple-300 font-medium mb-1 block">主色调</label>
            <input
              type="color"
              value={config.primaryColor}
              onChange={e => set("primaryColor", e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border border-purple-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-purple-300 font-medium mb-1 block">辅色调</label>
            <input
              type="color"
              value={config.secondaryColor}
              onChange={e => set("secondaryColor", e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border border-purple-500/50"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
