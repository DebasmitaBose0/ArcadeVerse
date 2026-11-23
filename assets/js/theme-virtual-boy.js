/**
 * Virtual Boy Theme Controller
 */

class VirtualBoyTheme {
  constructor() {
    this.id = 'virtual-boy';
    this.name = 'Virtual Boy 1995';
    this.palette = {
      black: '#000000',
      deepCrimson: '#5a0000',
      brightRuby: '#b00000',
      neonScarlet: '#ff0000'
    };
  }

  getStyles() {
    return {
      textShadow: '2px 0 0 #ff0000, -2px 0 0 #5a0000',
      borderColor: this.palette.brightRuby,
      background: this.palette.black,
      textColor: this.palette.neonScarlet
    };
  }

  isThemeActive(doc = document) {
    return doc.documentElement.getAttribute('data-theme') === this.id;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VirtualBoyTheme };
}
