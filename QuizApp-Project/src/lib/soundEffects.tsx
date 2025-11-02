// Sound effects using Web Audio API
class SoundEffects {
  private audioContext: AudioContext | null = null;
  private isMuted: boolean = false;

  private getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
    if (this.isMuted) return;
    
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.value = volume;

    oscillator.start(ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    oscillator.stop(ctx.currentTime + duration);
  }

  buttonClick() {
    this.playTone(800, 0.1, 'sine', 0.2);
  }

  correctAnswer() {
    const ctx = this.getAudioContext();
    if (this.isMuted) return;
    
    // Play ascending triad
    this.playTone(523.25, 0.15, 'sine', 0.25); // C5
    setTimeout(() => this.playTone(659.25, 0.15, 'sine', 0.25), 80); // E5
    setTimeout(() => this.playTone(783.99, 0.2, 'sine', 0.25), 160); // G5
  }

  wrongAnswer() {
    this.playTone(200, 0.3, 'sawtooth', 0.2);
  }

  quizStart() {
    const ctx = this.getAudioContext();
    if (this.isMuted) return;
    
    this.playTone(440, 0.15, 'sine', 0.25);
    setTimeout(() => this.playTone(554.37, 0.15, 'sine', 0.25), 100);
    setTimeout(() => this.playTone(659.25, 0.2, 'sine', 0.25), 200);
  }

  quizComplete() {
    const ctx = this.getAudioContext();
    if (this.isMuted) return;
    
    // Triumphant fanfare
    this.playTone(523.25, 0.2, 'sine', 0.2);
    setTimeout(() => this.playTone(659.25, 0.2, 'sine', 0.2), 150);
    setTimeout(() => this.playTone(783.99, 0.2, 'sine', 0.2), 300);
    setTimeout(() => this.playTone(1046.50, 0.3, 'sine', 0.2), 450);
  }

  timerWarning() {
    this.playTone(880, 0.1, 'square', 0.15);
    setTimeout(() => this.playTone(880, 0.1, 'square', 0.15), 150);
  }

  navigate() {
    this.playTone(600, 0.08, 'sine', 0.15);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
  }
}

export const soundEffects = new SoundEffects();
