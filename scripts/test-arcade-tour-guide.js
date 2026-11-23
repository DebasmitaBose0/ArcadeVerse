const test = require('node:test');
const assert = require('node:assert');
const { ArcadeTourGuide } = require('../assets/js/arcade-tour-guide.js');

test('ArcadeTourGuide steps through tour stops and handles mute state', () => {
  const tour = new ArcadeTourGuide();
  assert.strictEqual(tour.currentIndex, 0);
  assert.strictEqual(tour.getCurrentStep().id, 'featured-games');

  const step2 = tour.next();
  assert.strictEqual(step2.id, 'category-filter');

  tour.toggleMute();
  assert.strictEqual(tour.muted, true);

  tour.skip();
  assert.strictEqual(tour.completed, true);
});
