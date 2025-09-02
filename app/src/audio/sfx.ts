interface SfxSettings {
  volume: number;
  mute: boolean;
}

interface SfxState {
  volume: number;
  mute: boolean;
}

type SfxChangeListener = (state: SfxState) => void;

class SfxManager extends EventTarget {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private state: SfxState = { volume: 0.6, mute: false };
  private primed = false;
  private visibilityMuted = false;
  private storageKey = 'hc-mini:sfx';
  private listeners = new Set<SfxChangeListener>();

  constructor() {
    super();
    this.loadSettings();
    this.setupVisibilityHandling();
    // Emit initial state after restore
    this.emitChange();
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const settings: SfxSettings = JSON.parse(saved);
        this.state.volume = Math.max(0, Math.min(1, settings.volume || 0.6));
        this.state.mute = Boolean(settings.mute);
      }
    } catch (error) {
      console.warn('Failed to load SFX settings:', error);
    }
  }

  private saveSettings(): void {
    try {
      const settings: SfxSettings = {
        volume: this.state.volume,
        mute: this.state.mute
      };
      localStorage.setItem(this.storageKey, JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save SFX settings:', error);
    }
  }

  private setupVisibilityHandling(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.visibilityMuted = true;
        this.updateMasterVolume();
      } else {
        this.visibilityMuted = false;
        this.updateMasterVolume();
      }
    });
  }

  private ensure(): void {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.updateMasterVolume();
    }
  }

  private updateMasterVolume(): void {
    if (this.master) {
      const effectiveVolume = (this.state.mute || this.visibilityMuted) ? 0 : this.state.volume;
      this.master.gain.value = effectiveVolume;
    }
  }

  private emitChange(): void {
    const event = new CustomEvent('change', { 
      detail: { volume: this.state.volume, mute: this.state.mute } 
    });
    this.dispatchEvent(event);
    
    // Also notify direct listeners
    this.listeners.forEach(listener => listener(this.getState()));
  }

  prime(): void {
    if (this.primed) return;
    this.primed = true;

    const unlock = () => {
      this.ensure();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      // Play silent sound to unlock on iOS
      this.playSilent();
      // Emit change after priming
      this.emitChange();
    };

    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
  }

  private playSilent(): void {
    if (!this.ctx || !this.master) return;

    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    oscillator.connect(gain);
    gain.connect(this.master);
    
    gain.gain.value = 0;
    oscillator.frequency.value = 440;
    oscillator.start();
    oscillator.stop(this.ctx.currentTime + 0.01);
  }

  playJump(): void {
    if (!this.ctx || !this.master || this.state.mute) return;

    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    oscillator.connect(gain);
    gain.connect(this.master);
    
    // Square wave for retro jump sound
    oscillator.type = 'square';
    
    // Frequency sweep from 880Hz to 440Hz
    const now = this.ctx.currentTime;
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.exponentialRampToValueAtTime(440, now + 0.2);
    
    // Gain envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    oscillator.start(now);
    oscillator.stop(now + 0.2);
  }

  playCrash(): void {
    if (!this.ctx || !this.master || this.state.mute) return;

    // Create noise buffer
    const bufferSize = this.ctx.sampleRate * 0.35;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Fill with white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    
    // Low-pass filter for crash effect
    filter.type = 'lowpass';
    filter.frequency.value = 3000;
    filter.Q.value = 1;
    
    // Gain envelope for crash
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    
    source.start(now);
    source.stop(now + 0.35);
  }

  setVolume(volume: number): void {
    this.state.volume = Math.max(0, Math.min(1, volume));
    this.updateMasterVolume();
    this.saveSettings();
    this.emitChange();
  }

  setMute(mute: boolean): void {
    this.state.mute = mute;
    this.updateMasterVolume();
    this.saveSettings();
    this.emitChange();
  }

  toggleMute(): void {
    this.setMute(!this.state.mute);
  }

  getState(): SfxState {
    return { volume: this.state.volume, mute: this.state.mute };
  }

  get volume(): number {
    return this.state.volume;
  }

  get mute(): boolean {
    return this.state.mute;
  }

  // Legacy getters for backward compatibility
  getVolume(): number {
    return this.state.volume;
  }

  isMuted(): boolean {
    return this.state.mute;
  }

  // Subscription API
  subscribe(callback: SfxChangeListener): () => void {
    this.listeners.add(callback);
    // Immediately call with current state
    callback(this.getState());
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  testJump(): void {
    this.playJump();
  }

  testCrash(): void {
    this.playCrash();
  }
}

export const sfx = new SfxManager();