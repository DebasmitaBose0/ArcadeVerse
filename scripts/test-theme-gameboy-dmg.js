const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('theme-gameboy-dmg.css enforces authentic Game Boy DMG 4-shade olive green palette and LCD effects', () => {
  const cssPath = path.resolve(__dirname, '../assets/css/theme-gameboy-dmg.css');
  assert.ok(fs.existsSync(cssPath), 'theme-gameboy-dmg.css must exist');

  const cssContent = fs.readFileSync(cssPath, 'utf8');

  // Verify the exact physical Game Boy DMG color matrix variables
  assert.match(cssContent, /--dmg-darkest:\s*#0f380f;/, 'Defines Darkest Olive (#0f380f)');
  assert.match(cssContent, /--dmg-dark:\s*#306230;/, 'Defines Dark Olive (#306230)');
  assert.match(cssContent, /--dmg-light:\s*#8bac0f;/, 'Defines Light Olive (#8bac0f)');
  assert.match(cssContent, /--dmg-lightest:\s*#9bbc0f;/, 'Defines Lightest Background (#9bbc0f)');

  // Verify data-theme selector
  assert.match(cssContent, /data-theme="gameboy-dmg"/, 'Supports gameboy-dmg data-theme selector');

  // Verify subtle dot-matrix LCD sub-pixel grid with background-size: 2px 2px
  assert.match(cssContent, /background-size:\s*2px\s*2px/, 'Defines 2px 2px sub-pixel grid');

  // Verify ghosting decay filter
  assert.match(cssContent, /dmg-ghosting/, 'Supports ghosting decay transition class or attribute');
  assert.match(cssContent, /transition:\s*color\s*0\.28s/, 'Applies slow pixel response decay transition');

  // Verify UI components: cards, buttons, tables, reduced-motion
  assert.match(cssContent, /\.game-card/, 'Styles game cards');
  assert.match(cssContent, /\.btn/, 'Styles buttons');
  assert.match(cssContent, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, 'Honors prefers-reduced-motion media query');
});

test('Game Boy DMG theme contains zero Unicode emojis and zero external CDNs', () => {
  const cssPath = path.resolve(__dirname, '../assets/css/theme-gameboy-dmg.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  assert.equal(emojiRegex.test(cssContent), false, 'Found emoji in theme-gameboy-dmg.css');
  assert.equal(/http[s]?:\/\/.*(font|cdn)/i.test(cssContent), false, 'Found external CDN or font URL');
});

test('ThemeCustomizer and ThemeStudio properly integrate Game Boy DMG palette and controller', () => {
  const customizer = require('../assets/js/theme-customizer.js');
  const studio = require('../assets/js/theme-studio.js');

  // Verify customizer palette
  assert.ok(customizer.GAMEBOY_DMG_PALETTE, 'GAMEBOY_DMG_PALETTE must exist');
  assert.equal(customizer.GAMEBOY_DMG_PALETTE.id, 'gameboy_dmg');
  assert.equal(customizer.GAMEBOY_DMG_PALETTE.themeName, 'gameboy-dmg');
  assert.equal(customizer.GAMEBOY_DMG_PALETTE.darkestOlive, '#0f380f');
  assert.equal(customizer.GAMEBOY_DMG_PALETTE.darkOlive, '#306230');
  assert.equal(customizer.GAMEBOY_DMG_PALETTE.lightOlive, '#8bac0f');
  assert.equal(customizer.GAMEBOY_DMG_PALETTE.lightestBackground, '#9bbc0f');

  // Verify customizer functions
  assert.equal(typeof customizer.applyGameBoyDMGTheme, 'function', 'applyGameBoyDMGTheme must be exported');
  assert.equal(typeof customizer.toggleGameBoyGhosting, 'function', 'toggleGameBoyGhosting must be exported');
  assert.equal(typeof customizer.switchTheme, 'function', 'switchTheme must be exported');

  // Verify switchTheme support
  const applied = customizer.switchTheme('gameboy-dmg', false);
  assert.ok(applied);
  assert.equal(applied.id, 'gameboy_dmg');

  // Verify preset in studio
  const foundPreset = studio.PRESET_PALETTES.find(p => p.id === 'gameboy_dmg');
  assert.ok(foundPreset, 'gameboy_dmg preset must be present in PRESET_PALETTES');
  assert.equal(foundPreset.bgMain, '#9bbc0f');
  assert.equal(foundPreset.textPrimary, '#0f380f');

  // Verify WCAG contrast of textPrimary (#0f380f) vs bgMain (#9bbc0f)
  const cr = studio.getContrastRatio(foundPreset.textPrimary, foundPreset.bgMain);
  assert.ok(cr >= 4.5, `Contrast ratio must pass WCAG AA (>= 4.5), got ${cr}`);
});
