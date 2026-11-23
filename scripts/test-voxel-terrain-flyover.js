const test = require('node:test');
const assert = require('node:assert');
const { VoxelTerrainFlyoverEngine } = require('../assets/js/voxel-terrain-flyover.js');

test('VoxelTerrainFlyoverEngine initializes terrain and computes flight updates', () => {
  const engine = new VoxelTerrainFlyoverEngine(32, 32);
  const h = engine.getHeightAt(16, 16);
  assert.ok(h >= 10 && h <= 80);

  const t1 = engine.getTelemetry();
  assert.strictEqual(t1.altitude, 50);

  const t2 = engine.updateFlight(15, 0.5, 2);
  assert.strictEqual(t2.altitude, 65);
  assert.ok(t2.headingDeg > 0);
});
