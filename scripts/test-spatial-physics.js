const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ArcadeVerse = require("../assets/js/arcadeverse-sdk.js");

test("ArcadeVerse exposes Physics engine with createSpatialGrid and sweptAABB", () => {
  assert.ok(ArcadeVerse.Physics, "ArcadeVerse.Physics must exist");
  assert.strictEqual(typeof ArcadeVerse.Physics.createSpatialGrid, "function");
  assert.strictEqual(typeof ArcadeVerse.Physics.sweptAABB, "function");
  assert.strictEqual(typeof ArcadeVerse.Physics.raycast, "function");
});

test("Swept-AABB prevents tunneling for high-velocity projectiles through thin barriers", () => {
  // Thin wall at x=500 with width 5 (x: 500 to 505)
  const wall = { x: 500, y: 0, width: 5, height: 400 };

  // Bullet starting at x=100, width=10, moving at 2000px/s for dt=0.5s -> travel distance = 1000px!
  // At t=0: right edge is at 110.
  // At t=0.5: right edge would be at 1110 (completely past the 505 wall).
  const bullet = { x: 100, y: 150, width: 10, height: 10 };
  const vel = { x: 2000, y: 0 };
  const dt = 0.5;

  const result = ArcadeVerse.Physics.sweptAABB(bullet, vel, wall, { x: 0, y: 0 }, dt);

  assert.strictEqual(result.hit, true, "Collision must be detected despite high velocity");
  assert.ok(result.toi > 0 && result.toi < 1.0, "Time of impact must be fractional between 0 and 1");

  // Distance from right edge (110) to left edge of wall (500) = 390px.
  // Total travel = 2000 * 0.5 = 1000px.
  // Expected TOI = 390 / 1000 = 0.39.
  assert.ok(Math.abs(result.toi - 0.39) < 1e-4, `Expected TOI ~0.39, got ${result.toi}`);
  assert.strictEqual(result.normalX, -1, "Normal on left face must be -1");
  assert.strictEqual(result.normalY, 0);
});

test("Swept-AABB collision normals in all four cardinal directions", () => {
  const obstacle = { x: 100, y: 100, width: 40, height: 40 };

  // 1. Moving Right -> hits obstacle left face -> normal (-1, 0)
  const hitRight = ArcadeVerse.Physics.sweptAABB(
    { x: 40, y: 110, width: 20, height: 20 },
    { x: 100, y: 0 },
    obstacle,
    { x: 0, y: 0 },
    1.0
  );
  assert.strictEqual(hitRight.hit, true);
  assert.strictEqual(hitRight.normalX, -1);
  assert.strictEqual(hitRight.normalY, 0);

  // 2. Moving Left -> hits obstacle right face -> normal (1, 0)
  const hitLeft = ArcadeVerse.Physics.sweptAABB(
    { x: 160, y: 110, width: 20, height: 20 },
    { x: -100, y: 0 },
    obstacle,
    { x: 0, y: 0 },
    1.0
  );
  assert.strictEqual(hitLeft.hit, true);
  assert.strictEqual(hitLeft.normalX, 1);
  assert.strictEqual(hitLeft.normalY, 0);

  // 3. Moving Down -> hits obstacle top face -> normal (0, -1)
  const hitDown = ArcadeVerse.Physics.sweptAABB(
    { x: 110, y: 40, width: 20, height: 20 },
    { x: 0, y: 100 },
    obstacle,
    { x: 0, y: 0 },
    1.0
  );
  assert.strictEqual(hitDown.hit, true);
  assert.strictEqual(hitDown.normalX, 0);
  assert.strictEqual(hitDown.normalY, -1);

  // 4. Moving Up -> hits obstacle bottom face -> normal (0, 1)
  const hitUp = ArcadeVerse.Physics.sweptAABB(
    { x: 110, y: 160, width: 20, height: 20 },
    { x: 0, y: -100 },
    obstacle,
    { x: 0, y: 0 },
    1.0
  );
  assert.strictEqual(hitUp.hit, true);
  assert.strictEqual(hitUp.normalX, 0);
  assert.strictEqual(hitUp.normalY, 1);
});

test("Swept-AABB returns hit=false when trajectories do not intersect", () => {
  const b1 = { x: 0, y: 0, width: 10, height: 10 };
  const b2 = { x: 100, y: 100, width: 10, height: 10 };
  // Moving purely horizontal away from b2
  const miss = ArcadeVerse.Physics.sweptAABB(b1, { x: 50, y: 0 }, b2, { x: 0, y: 0 }, 1.0);
  assert.strictEqual(miss.hit, false);
  assert.strictEqual(miss.toi, 1.0);
});

test("Spatial Hash Grid de-duplicates entities spanning multiple cells", () => {
  const grid = ArcadeVerse.Physics.createSpatialGrid({ cellSize: 32 });

  // Entity spanning across 4 cells (from x: 20 to 50, y: 20 to 50)
  const bigEntity = { id: "boss", x: 20, y: 20, width: 30, height: 30 };
  grid.insert(bigEntity);

  let callbackCount = 0;
  const queried = grid.query({ x: 0, y: 0, width: 100, height: 100 }, () => {
    callbackCount++;
  });

  assert.strictEqual(queried.length, 1, "Must return exactly 1 unique entity");
  assert.strictEqual(callbackCount, 1, "Callback must be invoked exactly once per matching entity");
  assert.strictEqual(queried[0].id, "boss");
});

test("Spatial Hash Grid benchmarks 500 entities with sub-2ms query performance", () => {
  const grid = ArcadeVerse.Physics.createSpatialGrid({ cellSize: 64 });
  const ENTITY_COUNT = 500;

  for (let i = 0; i < ENTITY_COUNT; i++) {
    grid.insert({
      id: i,
      x: (i * 31) % 1500,
      y: (i * 47) % 1500,
      width: 16,
      height: 16
    });
  }

  assert.strictEqual(grid.size(), ENTITY_COUNT);

  // Time queries
  const start = performance.now();
  for (let q = 0; q < 50; q++) {
    grid.query({ x: (q * 23) % 1400, y: (q * 29) % 1400, width: 64, height: 64 });
  }
  const elapsed = performance.now() - start;

  assert.ok(elapsed < 10, `50 queries over 500 entities executed in ${elapsed.toFixed(2)}ms (sub-2ms avg per query)`);
});

test("Raycast through Spatial Grid identifies line-of-sight obstacles", () => {
  const grid = ArcadeVerse.Physics.createSpatialGrid({ cellSize: 64 });
  const target = { id: "enemy", x: 200, y: 90, width: 20, height: 20 };
  const bystander = { id: "bystander", x: 200, y: 300, width: 20, height: 20 };

  grid.insert(target);
  grid.insert(bystander);

  const start = { x: 0, y: 100 };
  const end = { x: 400, y: 100 };

  const hits = ArcadeVerse.Physics.raycast(grid, start, end);
  assert.strictEqual(hits.length, 1);
  assert.strictEqual(hits[0].entity.id, "enemy");
  assert.ok(hits[0].distance >= 199 && hits[0].distance <= 201);
});

test("Ensures zero Unicode emojis in spatial physics test and implementation", () => {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  const selfContent = fs.readFileSync(__filename, "utf8");
  assert.strictEqual(emojiRegex.test(selfContent), false, "Test file must not contain emojis");

  const sdkPath = path.resolve(__dirname, "../assets/js/arcadeverse-sdk.js");
  const sdkContent = fs.readFileSync(sdkPath, "utf8");
  assert.strictEqual(emojiRegex.test(sdkContent), false, "SDK file must not contain emojis");
});
