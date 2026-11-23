/**
 * ArcadeVerse - Gravitational Lensing & Accretion Disk Simulation Engine
 */

class GravitationalLensingEngine {
  constructor(options = {}) {
    this.massX = options.massX || 400;
    this.massY = options.massY || 300;
    this.massStrength = options.massStrength || 1500;
    this.eventHorizon = options.eventHorizon || 25;
    this.photonSphere = this.eventHorizon * 1.5;
  }

  setMassPosition(x, y) {
    this.massX = x;
    this.massY = y;
    return { x: this.massX, y: this.massY };
  }

  calculateDeflection(sourceX, sourceY) {
    const dx = sourceX - this.massX;
    const dy = sourceY - this.massY;
    const r = Math.sqrt(dx * dx + dy * dy);

    if (r < this.eventHorizon) {
      return { deflectedX: this.massX, deflectedY: this.massY, captured: true, r };
    }

    // Einstein deflection angle alpha proportional to 4GM / (c^2 * r)
    const deflectionFactor = this.massStrength / (r * r + 1);
    const deflectedX = sourceX - dx * deflectionFactor;
    const deflectedY = sourceY - dy * deflectionFactor;

    return {
      deflectedX: Math.round(deflectedX * 100) / 100,
      deflectedY: Math.round(deflectedY * 100) / 100,
      captured: false,
      r: Math.round(r * 100) / 100
    };
  }

  computeDopplerIntensity(angleRad, beta = 0.4) {
    // Relativistic Doppler beaming: intensity proportional to (1 + beta * cos(theta))^3
    const cosTheta = Math.cos(angleRad);
    const beamingFactor = Math.pow(1 + beta * cosTheta, 3);
    return Math.round(Math.max(0.1, beamingFactor) * 100) / 100;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GravitationalLensingEngine };
}
