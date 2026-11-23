/**
 * ArcadeVerse - Procedural Pseudo-3D Voxel Terrain Flyover Engine
 */

class VoxelTerrainFlyoverEngine {
  constructor(mapWidth = 64, mapHeight = 64) {
    this.width = mapWidth;
    this.height = mapHeight;
    this.heightmap = new Float32Array(mapWidth * mapHeight);
    this.colormap = new Uint32Array(mapWidth * mapHeight);
    
    this.camX = 32;
    this.camY = 32;
    this.altitude = 50;
    this.yaw = 0; // heading angle in radians
    this.speed = 1.0;
    
    this.generateProceduralTerrain();
  }

  generateProceduralTerrain() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const nx = x / this.width - 0.5;
        const ny = y / this.height - 0.5;
        // Simulated fractal heightmap sum
        const h = Math.sin(nx * 10) * Math.cos(ny * 10) * 30 + 40;
        this.heightmap[y * this.width + x] = h;
      }
    }
  }

  getHeightAt(x, y) {
    const ix = Math.floor(Math.max(0, Math.min(this.width - 1, x)));
    const iy = Math.floor(Math.max(0, Math.min(this.height - 1, y)));
    return this.heightmap[iy * this.width + ix];
  }

  updateFlight(dAltitude = 0, dYaw = 0, forward = 1) {
    this.yaw += dYaw;
    this.altitude = Math.max(10, Math.min(200, this.altitude + dAltitude));
    this.camX = (this.camX + Math.sin(this.yaw) * this.speed * forward + this.width) % this.width;
    this.camY = (this.camY + Math.cos(this.yaw) * this.speed * forward + this.height) % this.height;
    
    return this.getTelemetry();
  }

  getTelemetry() {
    return {
      altitude: Math.round(this.altitude),
      headingDeg: Math.round(((this.yaw * 180) / Math.PI + 360) % 360),
      x: Math.round(this.camX * 100) / 100,
      y: Math.round(this.camY * 100) / 100
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VoxelTerrainFlyoverEngine };
}
