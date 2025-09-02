import type { Replay, ReplayEvent } from './types';

class ReplayRecorder {
  private recording = false;
  private startTime = 0;
  private seed = 0;
  private events: ReplayEvent[] = [];
  private meta?: { level?: string; spec?: string };
  
  private handleKeyDown = (event: KeyboardEvent) => {
    if (!this.recording) return;
    
    const code = this.mapEventToCode(event);
    if (code) {
      const t = Date.now() - this.startTime;
      this.events.push({ t, k: "down", code });
    }
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    if (!this.recording) return;
    
    const code = this.mapEventToCode(event);
    if (code) {
      const t = Date.now() - this.startTime;
      this.events.push({ t, k: "up", code });
    }
  };

  private handlePointerDown = (_event: PointerEvent) => {
    if (!this.recording) return;
    
    const t = Date.now() - this.startTime;
    this.events.push({ t, k: "down", code: "SPACE" });
  };

  private handlePointerUp = (_event: PointerEvent) => {
    if (!this.recording) return;
    
    const t = Date.now() - this.startTime;
    this.events.push({ t, k: "up", code: "SPACE" });
  };

  private handleTouchStart = (_event: TouchEvent) => {
    if (!this.recording) return;
    
    const t = Date.now() - this.startTime;
    this.events.push({ t, k: "down", code: "SPACE" });
  };

  private handleTouchEnd = (_event: TouchEvent) => {
    if (!this.recording) return;
    
    const t = Date.now() - this.startTime;
    this.events.push({ t, k: "up", code: "SPACE" });
  };

  private mapEventToCode(event: KeyboardEvent): string | null {
    const code = event.code;
    
    // Map relevant keys
    if (code === 'Space') return 'SPACE';
    if (code === 'ArrowUp') return 'ARROWUP';
    if (code === 'KeyM') return 'M';
    if (code === 'KeyI') return 'I';
    
    return null;
  }

  start(seed: number, meta?: {level?:string; spec?:string}): void {
    if (this.recording) {
      this.stop(); // Stop any existing recording
    }
    
    this.recording = true;
    this.startTime = Date.now();
    this.seed = seed;
    this.meta = meta;
    this.events = [];
    
    // Add event listeners
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('touchstart', this.handleTouchStart);
    window.addEventListener('touchend', this.handleTouchEnd);
    
    console.log('Replay recording started with seed:', seed);
  }

  stop(): Replay {
    if (!this.recording) {
      throw new Error('No recording in progress');
    }
    
    this.recording = false;
    
    // Remove event listeners
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('touchstart', this.handleTouchStart);
    window.removeEventListener('touchend', this.handleTouchEnd);
    
    const replay: Replay = {
      seed: this.seed,
      startedAt: this.startTime,
      level: this.meta?.level,
      spec: this.meta?.spec,
      events: [...this.events]
    };
    
    console.log('Replay recording stopped, captured', this.events.length, 'events');
    
    return replay;
  }

  isRecording(): boolean {
    return this.recording;
  }
}

export const recorder = new ReplayRecorder();