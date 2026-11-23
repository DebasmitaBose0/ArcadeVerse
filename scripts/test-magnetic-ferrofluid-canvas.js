const test = require('node:test');
const assert = require('node:assert');
const { MagneticFerrofluidEngine } = require('../assets/js/magnetic-ferrofluid-canvas.js');

test('MagneticFerrofluidEngine calculates Rosensweig spike instability', () => {
  const engine = new MagneticFerrofluidEngine({ magnetX: 100, magnetY: 100, fieldStrength: 50 });
  
  // Point right next to magnet experiences high B-field, forms spike
  const close = engine.computeSpikeOffset(110, 100);
  assert.strictEqual(close.formsSpike, true);
  assert.ok(close.spikeHeight > 0);

  // Far point has weak field below threshold
  const far = engine.computeSpikeOffset(500, 500);
  assert.strictEqual(far.formsSpike, false);
  assert.strictEqual(far.spikeHeight, 0);
});
