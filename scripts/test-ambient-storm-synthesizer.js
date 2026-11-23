const test = require('node:test');
const assert = require('node:assert');
const { AmbientStormSynthesizer } = require('../assets/js/ambient-storm-synthesizer.js');

test('AmbientStormSynthesizer models wind filter scaling and procedural thunder', () => {
  const synth = new AmbientStormSynthesizer();
  synth.setWindVelocity(0.8);
  const filter = synth.getWindFilterParameters();
  assert.ok(filter.cutoffHz > 500);

  const thunder = synth.triggerThunder();
  assert.strictEqual(thunder.triggered, true);
  assert.ok(thunder.rumbleFreqHz >= 35 && thunder.rumbleFreqHz <= 75);
});
