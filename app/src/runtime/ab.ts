import type { GameSpec } from "../schema/types";

/** A/B の係数定義（必要に応じて調整） */
const AB_VARIANTS = {
  A: { scrollSpeedMul: 0.9, spawnRateMul: 0.9, label: "A" },
  B: { scrollSpeedMul: 1.1, spawnRateMul: 1.1, label: "B" },
} as const;

export type AbKey = keyof typeof AB_VARIANTS | undefined;

export function getAbKey(): AbKey {
  const v = new URLSearchParams(location.search).get("ab")?.toUpperCase();
  return (v === "A" || v === "B") ? (v as AbKey) : undefined;
}

/** spec をコピーして AB 係数を掛ける */
export function applyAB(spec: GameSpec): { spec: GameSpec; ab: AbKey } {
  const ab = getAbKey();
  if (!ab) return { spec, ab };

  const defs = AB_VARIANTS[ab];
  const out: GameSpec = JSON.parse(JSON.stringify(spec)); // shallow cloneでOK

  if (typeof out.scrollSpeed === "number") {
    out.scrollSpeed = Math.max(1, out.scrollSpeed * defs.scrollSpeedMul);
  }
  if (out.obstacle?.spawnRate != null) {
    out.obstacle.spawnRate = Math.max(0.1, out.obstacle.spawnRate * defs.spawnRateMul);
  }
  return { spec: out, ab };
}