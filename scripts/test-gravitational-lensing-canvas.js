const test = require('node:test');
const assert = require('node:assert');
const { GravitationalLensingEngine } = require('../assets/js/gravitational-lensing-canvas.js');

test('GravitationalLensingEngine calculates light deflection and event horizon capture', () => {
  const engine = new GravitationalLensingEngine({ massX: 100, massY: 100, eventHorizon: 20 });

  // Point inside event horizon is captured
  const captured = engine.calculateDeflection(105, 105);
  assert.strictEqual(captured.captured, true);

  // Far point has small deflection
  const far = engine.calculateDeflection(300, 300);
  assert.strictEqual(far.captured, false);
  assert.ok(far.deflectedX < 300);
  assert.ok(far.deflectedY < 300);
});

test('GravitationalLensingEngine calculates relativistic Doppler beaming intensity', () => {
  const engine = new GravitationalLensingEngine();
  // Approaching side (angle 0) has highest intensity
  const approaching = engine.computeDopplerIntensity(0);
  // Receding side (angle PI) has lowest intensity
  const receding = engine.computeDopplerIntensity(Math.PI);

  assert.ok(approaching > receding);
  assert.ok(approaching > 2.0);
  assert.ok(receding < 0.5);
});
