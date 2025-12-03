
export const SoundService = {
  ctx: null as AudioContext | null,

  init: () => {
    if (!SoundService.ctx) {
      SoundService.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  },

  playTone: (freq: number, type: OscillatorType, duration: number, startTime: number = 0) => {
    if (!SoundService.ctx) SoundService.init();
    const ctx = SoundService.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + startTime);
    osc.stop(ctx.currentTime + startTime + duration);
  },

  playLevelUp: () => {
    // Happy Major Arpeggio (C E G C)
    const now = 0;
    SoundService.playTone(523.25, 'square', 0.1, now);       // C5
    SoundService.playTone(659.25, 'square', 0.1, now + 0.1); // E5
    SoundService.playTone(783.99, 'square', 0.1, now + 0.2); // G5
    SoundService.playTone(1046.50, 'square', 0.4, now + 0.3);// C6
  },

  playSkillUp: () => {
    // Quick high pitched trill
    const now = 0;
    SoundService.playTone(880, 'sine', 0.1, now);
    SoundService.playTone(1108, 'sine', 0.2, now + 0.1);
  }
};
