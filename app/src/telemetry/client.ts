export type Telemetry = {
  sessionId: string;
  seed?: number;
  level?: string;
  firstFailTime?: number;
  maxDistance?: number;
  fpsAvg?: number;
  ver: string;
};

interface TelemetryClient {
  tick(dt: number): void;
  noteFailOnce(sec: number): void;
  noteDistance(x: number): void;
  flush(reason: "end" | "manual"): Promise<void>;
}

class TelemetryManager implements TelemetryClient {
  private sessionId: string;
  private seed?: number;
  private level?: string;
  private firstFailTime?: number;
  private maxDistance = 0;
  private fpsValues: number[] = [];
  private telemetryUrl?: string;
  private failureNoted = false;

  constructor() {
    // Generate unique session ID
    this.sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    
    // Get telemetry URL from environment
    this.telemetryUrl = import.meta.env.VITE_TELEMETRY_URL;
    
    if (!this.telemetryUrl) {
      console.log('[Telemetry] No VITE_TELEMETRY_URL configured, using console output');
    }
  }

  setSeed(seed: number): void {
    this.seed = seed;
  }

  setLevel(level: string): void {
    this.level = level;
  }

  tick(dt: number): void {
    // Calculate and store FPS (delta time is in milliseconds)
    if (dt > 0) {
      const fps = 1000 / dt;
      this.fpsValues.push(fps);
      
      // Keep only recent FPS values (last 60 samples)
      if (this.fpsValues.length > 60) {
        this.fpsValues.shift();
      }
    }
  }

  noteFailOnce(sec: number): void {
    if (!this.failureNoted) {
      this.firstFailTime = sec;
      this.failureNoted = true;
    }
  }

  noteDistance(x: number): void {
    this.maxDistance = Math.max(this.maxDistance, x);
  }

  async flush(reason: "end" | "manual"): Promise<void> {
    // Calculate average FPS
    const fpsAvg = this.fpsValues.length > 0 
      ? this.fpsValues.reduce((sum, fps) => sum + fps, 0) / this.fpsValues.length 
      : undefined;

    const telemetryData: Telemetry = {
      sessionId: this.sessionId,
      seed: this.seed,
      level: this.level,
      firstFailTime: this.firstFailTime,
      maxDistance: this.maxDistance > 0 ? this.maxDistance : undefined,
      fpsAvg: fpsAvg ? Math.round(fpsAvg * 100) / 100 : undefined,
      ver: "1.0.0"
    };

    // Filter out undefined values
    const cleanData = Object.fromEntries(
      Object.entries(telemetryData).filter(([_, v]) => v !== undefined)
    ) as Telemetry;

    if (this.telemetryUrl) {
      try {
        await fetch(this.telemetryUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cleanData),
        });
        console.log('[Telemetry] Data sent successfully:', reason);
      } catch (error) {
        console.error('[Telemetry] Failed to send data:', error);
        console.log('[Telemetry] Data (fallback to console):', cleanData);
      }
    } else {
      // Fallback to console output
      console.log(`[Telemetry] Session data (${reason}):`, cleanData);
    }

    // Reset for potential next session
    this.resetSession();
  }

  private resetSession(): void {
    this.maxDistance = 0;
    this.fpsValues = [];
    this.failureNoted = false;
    this.firstFailTime = undefined;
  }
}

let telemetryInstance: TelemetryManager | null = null;

export function initTelemetry(): TelemetryClient {
  if (!telemetryInstance) {
    telemetryInstance = new TelemetryManager();
  }
  return telemetryInstance;
}

// Export additional helper functions for setting context
export function setTelemetrySeed(seed: number): void {
  if (telemetryInstance) {
    (telemetryInstance as TelemetryManager).setSeed(seed);
  }
}

export function setTelemetryLevel(level: string): void {
  if (telemetryInstance) {
    (telemetryInstance as TelemetryManager).setLevel(level);
  }
}