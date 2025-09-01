class SfxManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume = 0.5;
  private primed = false;

  private ensure(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = this.volume;
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
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  getVolume(): number {
    return this.volume;
  }
}

export const sfx = new SfxManager();