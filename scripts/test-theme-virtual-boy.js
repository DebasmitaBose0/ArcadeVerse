const test = require('node:test');
const assert = require('node:assert');
const { VirtualBoyTheme } = require('../assets/js/theme-virtual-boy.js');

test('VirtualBoyTheme provides accurate palette and stereoscopic text shadow', () => {
  const vb = new VirtualBoyTheme();
  assert.strictEqual(vb.palette.neonScarlet, '#ff0000');
  assert.strictEqual(vb.palette.black, '#000000');
  
  const styles = vb.getStyles();
  assert.ok(styles.textShadow.includes('#ff0000'));
  assert.ok(styles.textShadow.includes('#5a0000'));
  assert.strictEqual(styles.borderColor, '#b00000');
});
