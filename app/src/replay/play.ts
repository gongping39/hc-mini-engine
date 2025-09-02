import type { Replay, ReplayEvent } from './types';

class ReplayPlayer {
  private playing = false;
  private timeouts: number[] = [];

  private dispatchSyntheticEvent(type: "down" | "up", code: string, dispatch: (type: "down" | "up", code: string) => void): void {
    // Call the provided dispatch function
    dispatch(type, code);
    
    // Also dispatch synthetic keyboard events for compatibility
    let eventType: string;
    let keyCode: string;
    
    if (type === "down") {
      eventType = 'keydown';
    } else {
      eventType = 'keyup';
    }
    
    // Map codes back to keyboard events
    switch (code) {
      case 'SPACE':
        keyCode = 'Space';
        break;
      case 'ARROWUP':
        keyCode = 'ArrowUp';
        break;
      case 'M':
        keyCode = 'KeyM';
        break;
      case 'I':
        keyCode = 'KeyI';
        break;
      case 'POINTER':
      case 'TOUCH':
        // For pointer/touch events, simulate as space
        keyCode = 'Space';
        break;
      default:
        return;
    }
    
    // Create and dispatch synthetic keyboard event
    const syntheticEvent = new KeyboardEvent(eventType, {
      code: keyCode,
      key: keyCode === 'Space' ? ' ' : keyCode,
      bubbles: true,
      cancelable: true
    });
    
    document.dispatchEvent(syntheticEvent);
    
    // For pointer/touch events, also dispatch pointer events
    if (code === 'POINTER' || code === 'TOUCH') {
      const pointerEventType = type === 'down' ? 'pointerdown' : 'pointerup';
      const pointerEvent = new PointerEvent(pointerEventType, {
        bubbles: true,
        cancelable: true,
        clientX: 400,
        clientY: 300
      });
      document.dispatchEvent(pointerEvent);
    }
  }

  async play(replay: Replay, dispatch: (type: "down" | "up", code: string) => void): Promise<void> {
    if (this.playing) {
      this.cancel();
    }
    
    this.playing = true;
    
    console.log('Starting replay with seed:', replay.seed, 'and', replay.events.length, 'events');
    
    return new Promise((resolve) => {
      if (replay.events.length === 0) {
        this.playing = false;
        resolve();
        return;
      }
      
      // Schedule all events
      let completedEvents = 0;
      
      replay.events.forEach((event: ReplayEvent) => {
        const timeout = window.setTimeout(() => {
          if (!this.playing) return;
          
          this.dispatchSyntheticEvent(event.k, event.code, dispatch);
          completedEvents++;
          
          // Check if this was the last event
          if (completedEvents === replay.events.length) {
            this.playing = false;
            console.log('Replay completed');
            resolve();
          }
        }, event.t);
        
        this.timeouts.push(timeout);
      });
      
      // Set a maximum timeout to prevent hanging
      const maxTimeout = window.setTimeout(() => {
        if (this.playing) {
          this.playing = false;
          console.log('Replay timed out');
          resolve();
        }
      }, Math.max(replay.events[replay.events.length - 1]?.t || 0, 0) + 5000);
      
      this.timeouts.push(maxTimeout);
    });
  }

  cancel(): void {
    if (!this.playing) return;
    
    this.playing = false;
    
    // Clear all scheduled timeouts
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts = [];
    
    console.log('Replay cancelled');
  }

  isPlaying(): boolean {
    return this.playing;
  }
}

export const player = new ReplayPlayer();