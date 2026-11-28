const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Mock browser window and document for unit testing
const listeners = {
  window: {},
  document: {}
};

globalThis.window = {
  addEventListener: (evt, cb) => {
    listeners.window[evt] = listeners.window[evt] || [];
    listeners.window[evt].push(cb);
  },
  removeEventListener: (evt, cb) => {
    if (!listeners.window[evt]) return;
    const idx = listeners.window[evt].indexOf(cb);
    if (idx !== -1) listeners.window[evt].splice(idx, 1);
  },
  dispatchEvent: (evt) => {
    const arr = listeners.window[evt.type] || [];
    arr.forEach(fn => fn(evt));
  }
};

globalThis.document = {
  hidden: false,
  addEventListener: (evt, cb) => {
    listeners.document[evt] = listeners.document[evt] || [];
    listeners.document[evt].push(cb);
  },
  removeEventListener: (evt, cb) => {
    if (!listeners.document[evt]) return;
    const idx = listeners.document[evt].indexOf(cb);
    if (idx !== -1) listeners.document[evt].splice(idx, 1);
  }
};

const ArcadeVerse = require("../assets/js/arcadeverse-sdk.js");

function emitKeyDown(code, key) {
  const evt = { type: "keydown", code: code, key: key || code };
  (listeners.window.keydown || []).forEach(fn => fn(evt));
}

function emitKeyUp(code, key) {
  const evt = { type: "keyup", code: code, key: key || code };
  (listeners.window.keyup || []).forEach(fn => fn(evt));
}

function emitBlur() {
  const evt = { type: "blur" };
  (listeners.window.blur || []).forEach(fn => fn(evt));
}

test("ArcadeVerse exposes createInputManager API", () => {
  assert.strictEqual(typeof ArcadeVerse.createInputManager, "function", "createInputManager must be a function");
});

test("Semantic action mapping handles multi-device triggers", () => {
  const input = ArcadeVerse.createInputManager({
    actions: {
      JUMP: ["Space", "KeyW", "GamepadButton0"],
      FIRE: ["KeyJ", "KeyZ"]
    }
  });

  assert.strictEqual(input.isActionDown("JUMP"), false);

  emitKeyDown("KeyW");
  assert.strictEqual(input.isActionDown("JUMP"), true);
  assert.strictEqual(input.wasActionJustPressed("JUMP"), true);

  emitKeyUp("KeyW");
  assert.strictEqual(input.isActionDown("JUMP"), false);
  assert.strictEqual(input.wasActionJustReleased("JUMP"), true);

  input.destroy();
});

test("Focus-loss auto-flush immediately clears all pressed keys and actions", () => {
  const input = ArcadeVerse.createInputManager({
    actions: {
      MOVE_RIGHT: ["ArrowRight", "KeyD"],
      SHOOT: ["Space"]
    }
  });

  emitKeyDown("ArrowRight");
  emitKeyDown("Space");

  assert.strictEqual(input.isActionDown("MOVE_RIGHT"), true);
  assert.strictEqual(input.isActionDown("SHOOT"), true);

  // Tab switch / window blur occurs while keys were physically down
  emitBlur();

  assert.strictEqual(input.isActionDown("MOVE_RIGHT"), false, "MOVE_RIGHT must be cleared on blur");
  assert.strictEqual(input.isActionDown("SHOOT"), false, "SHOOT must be cleared on blur");
  assert.strictEqual(input.isKeyDown("ArrowRight"), false, "Physical key state must be cleared");

  input.destroy();
});

test("Document visibility change to hidden auto-flushes pressed states", () => {
  const input = ArcadeVerse.createInputManager({
    actions: {
      BOOST: ["ShiftLeft"]
    }
  });

  emitKeyDown("ShiftLeft");
  assert.strictEqual(input.isActionDown("BOOST"), true);

  // Document goes hidden
  globalThis.document.hidden = true;
  (listeners.document.visibilitychange || []).forEach(fn => fn());

  assert.strictEqual(input.isActionDown("BOOST"), false, "BOOST must be cleared when document hidden");

  globalThis.document.hidden = false;
  input.destroy();
});

test("Discrete frame-based edge detection operates across ticks", () => {
  const input = ArcadeVerse.createInputManager({
    actions: {
      DASH: ["KeyX"]
    }
  });

  // Tick 1: key pressed
  emitKeyDown("KeyX");
  assert.strictEqual(input.wasActionJustPressed("DASH"), true);
  assert.strictEqual(input.isActionDown("DASH"), true);

  // Advance frame
  input.update();
  assert.strictEqual(input.wasActionJustPressed("DASH"), false, "wasActionJustPressed must expire after 1 tick");
  assert.strictEqual(input.isActionDown("DASH"), true, "isActionDown remains true while held");

  // Tick 2: key released
  emitKeyUp("KeyX");
  assert.strictEqual(input.wasActionJustReleased("DASH"), true);
  assert.strictEqual(input.isActionDown("DASH"), false);

  // Advance frame
  input.update();
  assert.strictEqual(input.wasActionJustReleased("DASH"), false, "wasActionJustReleased must expire after 1 tick");

  input.destroy();
});

test("Input buffering queue preserves rapid inputs within bufferMs", async () => {
  const input = ArcadeVerse.createInputManager({
    actions: {
      JUMP: ["Space"]
    },
    bufferMs: 100
  });

  emitKeyDown("Space");
  emitKeyUp("Space");

  assert.strictEqual(input.hasBufferedAction("JUMP"), true);
  assert.strictEqual(input.consumeBufferedAction("JUMP"), true, "Should consume buffered jump");
  assert.strictEqual(input.consumeBufferedAction("JUMP"), false, "Already consumed");

  // Input buffering with manual expiration
  input.bufferAction("JUMP");
  assert.strictEqual(input.hasBufferedAction("JUMP"), true);

  // Wait past 100ms
  await new Promise(res => setTimeout(res, 120));

  assert.strictEqual(input.hasBufferedAction("JUMP"), false, "Buffered action should expire after bufferMs");
  assert.strictEqual(input.consumeBufferedAction("JUMP"), false);

  input.destroy();
});

test("Normalized axis calculation with deadzone clamping", () => {
  const input = ArcadeVerse.createInputManager({
    actions: {
      MOVE_LEFT: ["KeyA"],
      MOVE_RIGHT: ["KeyD"]
    },
    deadzone: 0.15
  });

  assert.strictEqual(input.getAxis("HORIZONTAL"), 0);

  emitKeyDown("KeyD");
  assert.strictEqual(input.getAxis("HORIZONTAL"), 1);

  emitKeyDown("KeyA");
  assert.strictEqual(input.getAxis("HORIZONTAL"), 0);

  emitKeyUp("KeyD");
  assert.strictEqual(input.getAxis("HORIZONTAL"), -1);

  emitKeyUp("KeyA");
  assert.strictEqual(input.getAxis("HORIZONTAL"), 0);

  input.destroy();
});

test("Lifecycle teardown unbinds listeners cleanly on destroy()", () => {
  const initialBlurCount = (listeners.window.blur || []).length;
  const initialKeydownCount = (listeners.window.keydown || []).length;

  const input = ArcadeVerse.createInputManager({
    actions: { TEST: ["Space"] }
  });

  assert.strictEqual((listeners.window.blur || []).length, initialBlurCount + 1);
  assert.strictEqual((listeners.window.keydown || []).length, initialKeydownCount + 1);

  input.destroy();

  assert.strictEqual((listeners.window.blur || []).length, initialBlurCount);
  assert.strictEqual((listeners.window.keydown || []).length, initialKeydownCount);
});

test("Ensures zero Unicode emojis in input manager test and implementation", () => {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  const selfContent = fs.readFileSync(__filename, "utf8");
  assert.strictEqual(emojiRegex.test(selfContent), false, "Test file must not contain emojis");

  const sdkPath = path.resolve(__dirname, "../assets/js/arcadeverse-sdk.js");
  const sdkContent = fs.readFileSync(sdkPath, "utf8");
  assert.strictEqual(emojiRegex.test(sdkContent), false, "SDK file must not contain emojis");
});
