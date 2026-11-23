/**
 * ArcadeVerse - Web Audio Procedural Atmospheric Storm & Distant Thunder Synthesizer
 */

class AmbientStormSynthesizer {
  constructor() {
    this.rainVolume = 0.5;
    this.windVelocity = 0.4;
    this.active = false;
    this.lastThunderTime = 0;
  }

  setRainIntensity(val) {
    this.rainVolume = Math.max(0, Math.min(1, val));
    return this.rainVolume;
  }

  setWindVelocity(val) {
    this.windVelocity = Math.max(0, Math.min(1, val));
    return this.windVelocity;
  }

  getWindFilterParameters() {
    // Cutoff frequency scales between 150 Hz and 700 Hz based on wind velocity
    const cutoff = 150 + this.windVelocity * 550;
    const qFactor = 2.0 + this.windVelocity * 3.0;
    return { cutoffHz: Math.round(cutoff), q: Math.round(qFactor * 10) / 10 };
  }

  triggerThunder() {
    this.lastThunderTime = Date.now();
    // Thunder rumble parameters: sub-bass resonant decay between 30 Hz and 75 Hz
    const rumbleFreq = Math.round(35 + Math.random() * 40);
    const decaySec = Math.round((2.5 + Math.random() * 2.0) * 10) / 10;
    return {
      triggered: true,
      rumbleFreqHz: rumbleFreq,
      decayDurationSec: decaySec,
      timestamp: this.lastThunderTime
    };
  }

  getAudioProfile() {
    return {
      rain: this.rainVolume,
      wind: this.windVelocity,
      windFilter: this.getWindFilterParameters()
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AmbientStormSynthesizer };
}
