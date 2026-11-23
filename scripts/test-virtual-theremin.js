const test = require('node:test');
const assert = require('node:assert');
const { VirtualThereminEngine } = require('../assets/js/virtual-theremin.js');

test('VirtualThereminEngine calculates exponential continuous pitch', () => {
  const theremin = new VirtualThereminEngine();
  
  // Left edge should be minFreq (65 Hz)
  const fMin = theremin.calculateFrequency(0);
  assert.strictEqual(fMin, 65);
  
  // Right edge should be maxFreq (1046 Hz)
  const fMax = theremin.calculateFrequency(1);
  assert.strictEqual(fMax, 1046);
  
  // Midpoint should follow exponential curve (around 260.7 Hz)
  const fMid = theremin.calculateFrequency(0.5);
  assert.ok(fMid > 200 && fMid < 300);
});

test('VirtualThereminEngine maps vertical gain and handles vibrato modulation', () => {
  const theremin = new VirtualThereminEngine();
  
  // Silence at bottom
  assert.strictEqual(theremin.calculateGain(0), 0);
  // Full volume at top
  assert.strictEqual(theremin.calculateGain(1), 1);
  
  // Vibrato limits
  const vib = theremin.setVibrato(7.5, 25);
  assert.strictEqual(vib.rate, 7.5);
  assert.strictEqual(vib.depth, 25);
  
  theremin.start();
  const state = theremin.getAudioState();
  assert.strictEqual(state.active, true);
  assert.strictEqual(state.waveform, 'sine');
});
