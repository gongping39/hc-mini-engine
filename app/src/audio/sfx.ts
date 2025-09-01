interface SfxSettings {
  volume: number;
  mute: boolean;
}

class SfxManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume = 0.6;
  private mute = false;
  private primed = false;
  private visibilityMuted = false;
  private storageKey = 'hc-mini:sfx';

  constructor() {
    this.loadSettings();
    this.setupVisibilityHandling();
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const settings: SfxSettings = JSON.parse(saved);
        this.volume = Math.max(0, Math.min(1, settings.volume || 0.6));
        this.mute = Boolean(settings.mute);
      }
    } catch (error) {
      console.warn('Failed to load SFX settings:', error);
    }
  }

  private saveSettings(): void {
    try {
      const settings: SfxSettings = {
        volume: this.volume,
        mute: this.mute
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
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.updateMasterVolume();
    }
  }

  private updateMasterVolume(): void {
    if (this.masterGain) {
      const effectiveVolume = (this.mute || this.visibilityMuted) ? 0 : this.volume;
      this.masterGain.gain.value = effectiveVolume;
    }
  }

  prime(): void {
    if (this.primed) return;
    this.primed = true;

    const unlock = () => {
      this.ensure();
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      // Play silent sound to unlock on iOS
      this.playSilent();
    };

    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
  }

  private playSilent(): void {
    if (!this.audioContext || !this.masterGain) return;

    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    oscillator.connect(gain);
    gain.connect(this.masterGain);
    
    gain.gain.value = 0;
    oscillator.frequency.value = 440;
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.01);
  }

  playJump(): void {
    if (!this.audioContext || !this.masterGain) return;

    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    oscillator.connect(gain);
    gain.connect(this.masterGain);
    
    // Square wave for retro jump sound
    oscillator.type = 'square';
    
    // Frequency sweep from 880Hz to 440Hz
    const now = this.audioContext.currentTime;
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
    if (!this.audioContext || !this.masterGain) return;

    // Create noise buffer
    const bufferSize = this.audioContext.sampleRate * 0.35;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Fill with white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const source = this.audioContext.createBufferSource();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    // Low-pass filter for crash effect
    filter.type = 'lowpass';
    filter.frequency.value = 3000;
    filter.Q.value = 1;
    
    // Gain envelope for crash
    const now = this.audioContext.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    
    source.start(now);
    source.stop(now + 0.35);
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.updateMasterVolume();
    this.saveSettings();
  }

  getVolume(): number {
    return this.volume;
  }

  toggleMute(): void {
    this.mute = !this.mute;
    this.updateMasterVolume();
    this.saveSettings();
  }

  isMuted(): boolean {
    return this.mute;
  }

  setMute(mute: boolean): void {
    this.mute = mute;
    this.updateMasterVolume();
    this.saveSettings();
  }

  testJump(): void {
    this.playJump();
  }

  testCrash(): void {
    this.playCrash();
  }
}

export const sfx = new SfxManager();