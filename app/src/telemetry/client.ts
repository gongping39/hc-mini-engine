export type TelemetryPayload = {
  sessionId: string;
  ts: number;
  ver: string;
  seed?: number;
  spec?: string;
  level?: string;
  firstFailTime?: number;   // 秒
  maxDistance?: number;     // 距離 or スコア秒（使いやすい方）
  fpsAvg?: number;
  userAgent?: string;
};

export type TelemetryHandle = {
  tick: (dtMs: number) => void;
  noteFailOnce: (sec: number) => void;
  noteDistance: (x: number) => void;
  flush: (reason?: "end" | "manual" | "hidden") => Promise<void>;
};

function randId() {
  return (crypto as any)?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

export function initTelemetry(init?: { level?: string }): TelemetryHandle {
  const sessionId = randId();
  const ver = "0.1";

  let firstFailTime: number | undefined;
  let maxDistance = 0;
  let fpsAvg = 0;
  let samples = 0;

  function tick(dtMs: number) {
    const fps = dtMs > 0 ? 1000 / dtMs : 0;
    samples++;
    // 一次移動平均（安定）
    fpsAvg += (fps - fpsAvg) / samples;
  }

  function noteFailOnce(sec: number) {
    if (firstFailTime === undefined) firstFailTime = Math.max(0, sec);
  }

  function noteDistance(x: number) {
    if (x > maxDistance) maxDistance = x;
  }

  async function flush(reason: "end" | "manual" | "hidden" = "manual") {
    const params = new URLSearchParams(location.search);
    const seed = params.get("seed") ? Number(params.get("seed")) : undefined;
    const spec = params.get("spec") || undefined;

    const payload: TelemetryPayload = {
      sessionId,
      ts: Date.now(),
      ver,
      seed,
      spec,
      level: init?.level,
      firstFailTime,
      maxDistance,
      fpsAvg: Number(fpsAvg.toFixed(1)),
      userAgent: navigator.userAgent,
    };

    const url = (import.meta as any).env?.VITE_TELEMETRY_URL as string | undefined;

    try {
      if (url) {
        await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          // ページ遷移時も送れるよう keepalive（hidden/end で特に有効）
          keepalive: reason !== "manual",
        });
      } else {
        // 送信先が無ければコンソールに出すだけ（安全）
        // eslint-disable-next-line no-console
        console.log("[telemetry]", payload);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[telemetry] failed", e);
    }
  }

  // 画面遷移・非表示でも軽量送信
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush("hidden");
  });
  window.addEventListener("pagehide", () => void flush("hidden"));
  window.addEventListener("beforeunload", () => void flush("hidden"));

  return { tick, noteFailOnce, noteDistance, flush };
}