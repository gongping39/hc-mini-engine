import type { GameSpec } from '../schema/types';

export async function getSpec(name: string): Promise<GameSpec> {
  const base = (import.meta as any).env?.BASE_URL || "/";
  const url  = `${base}specs/${encodeURIComponent(name)}.json`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) return (await res.json()) as GameSpec;
  } catch {}
  // local fallback (dev/404)
  if (name === "example") {
    const spec = (await import("../schema/example.json")).default as GameSpec;
    return spec;
  }
  throw new Error(`Spec not found: ${url}`);
}