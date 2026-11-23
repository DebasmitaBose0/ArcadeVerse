/**
 * ArcadeVerse - Dynamic Web Audio Theremin Instrument
 * Continuous-pitch gesture instrument with exponential frequency tracking and vibrato LFO.
 */

class VirtualThereminEngine {
  constructor(options = {}) {
    this.minFreq = options.minFreq || 65; // C2
    this.maxFreq = options.maxFreq || 1046; // C6
    this.vibratoRate = options.vibratoRate || 6; // 6 Hz default
    this.vibratoDepth = options.vibratoDepth || 15; // 15 Hz modulation depth
    this.waveform = options.waveform || 'sine';
    
    this.currentFreq = this.minFreq;
    this.currentGain = 0;
    this.active = false;
  }

  calculateFrequency(normalizedX) {
    const clampedX = Math.max(0, Math.min(1, normalizedX));
    // Exponential pitch mapping: f = min * (max / min) ^ x
    const freq = this.minFreq * Math.pow(this.maxFreq / this.minFreq, clampedX);
    this.currentFreq = Math.round(freq * 100) / 100;
    return this.currentFreq;
  }

  calculateGain(normalizedY) {
    // 0 is bottom (silence), 1 is top (max volume)
    const clampedY = Math.max(0, Math.min(1, normalizedY));
    this.currentGain = Math.round(clampedY * 100) / 100;
    return this.currentGain;
  }

  setVibrato(rateHz, depthHz) {
    this.vibratoRate = Math.max(1, Math.min(20, rateHz));
    this.vibratoDepth = Math.max(0, Math.min(50, depthHz));
    return { rate: this.vibratoRate, depth: this.vibratoDepth };
  }

  setWaveform(type) {
    const allowed = ['sine', 'triangle', 'sawtooth', 'square'];
    if (allowed.includes(type)) {
      this.waveform = type;
    }
    return this.waveform;
  }

  getAudioState() {
    return {
      active: this.active,
      frequency: this.currentFreq,
      gain: this.currentGain,
      waveform: this.waveform,
      vibrato: {
        rate: this.vibratoRate,
        depth: this.vibratoDepth
      }
    };
  }

  start() {
    this.active = true;
    return this.getAudioState();
  }

  stop() {
    this.active = false;
    this.currentGain = 0;
    return this.getAudioState();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VirtualThereminEngine };
}
