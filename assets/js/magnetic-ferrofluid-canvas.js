/**
 * ArcadeVerse - Interactive 2D Magnetic Ferrofluid Physics Canvas
 */

class MagneticFerrofluidEngine {
  constructor(options = {}) {
    this.magnetX = options.magnetX || 200;
    this.magnetY = options.magnetY || 200;
    this.fieldStrength = options.fieldStrength || 50;
    this.criticalThreshold = options.criticalThreshold || 20; // Rosensweig critical threshold
  }

  setMagnetPosition(x, y) {
    this.magnetX = x;
    this.magnetY = y;
  }

  computeSpikeOffset(x, y) {
    const dx = this.magnetX - x;
    const dy = this.magnetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
    
    // Magnetic field magnitude B proportional to 1 / dist^2
    const bField = (this.fieldStrength * 1000) / (dist * dist);
    
    if (bField < this.criticalThreshold) {
      return { spikeHeight: 0, formsSpike: false, field: Math.round(bField) };
    }

    // Rosensweig instability spike growth
    const excess = bField - this.criticalThreshold;
    const spikeHeight = Math.min(40, excess * 0.8);
    
    const normalX = dx / dist;
    const normalY = dy / dist;

    return {
      spikeHeight: Math.round(spikeHeight * 100) / 100,
      formsSpike: true,
      displacementX: Math.round(normalX * spikeHeight * 100) / 100,
      displacementY: Math.round(normalY * spikeHeight * 100) / 100,
      field: Math.round(bField)
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MagneticFerrofluidEngine };
}
