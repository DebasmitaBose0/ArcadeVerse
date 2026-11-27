const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ArcadeVerse = require("../assets/js/arcadeverse-sdk.js");

test("ArcadeVerse exposes createStateMachine API", () => {
  assert.strictEqual(typeof ArcadeVerse.createStateMachine, "function", "createStateMachine must be a function");
});

test("Hierarchical state machine executes onEnter and onExit in correct order", () => {
  const executionLog = [];

  const fsm = ArcadeVerse.createStateMachine({
    initial: "MENU",
    states: {
      MENU: {
        onEnter: () => executionLog.push("ENTER_MENU"),
        onExit: () => executionLog.push("EXIT_MENU")
      },
      GAMEPLAY: {
        onEnter: () => executionLog.push("ENTER_GAMEPLAY"),
        onExit: () => executionLog.push("EXIT_GAMEPLAY")
      },
      "GAMEPLAY.COMBAT": {
        parent: "GAMEPLAY",
        onEnter: () => executionLog.push("ENTER_COMBAT"),
        onExit: () => executionLog.push("EXIT_COMBAT")
      },
      "GAMEPLAY.INVENTORY": {
        parent: "GAMEPLAY",
        onEnter: () => executionLog.push("ENTER_INVENTORY"),
        onExit: () => executionLog.push("EXIT_INVENTORY")
      }
    }
  });

  assert.strictEqual(fsm.getCurrentState(), "MENU");
  assert.deepStrictEqual(executionLog, ["ENTER_MENU"]);
  executionLog.length = 0;

  // Transition from MENU to child state GAMEPLAY.COMBAT
  // Expected order: EXIT_MENU -> ENTER_GAMEPLAY -> ENTER_COMBAT
  fsm.transitionTo("GAMEPLAY.COMBAT");
  assert.strictEqual(fsm.getCurrentState(), "GAMEPLAY.COMBAT");
  assert.strictEqual(fsm.isInState("GAMEPLAY"), true, "Must be considered in parent state");
  assert.strictEqual(fsm.isInState("GAMEPLAY.COMBAT"), true);
  assert.deepStrictEqual(executionLog, ["EXIT_MENU", "ENTER_GAMEPLAY", "ENTER_COMBAT"]);
  executionLog.length = 0;

  // Transition between sibling child states GAMEPLAY.COMBAT -> GAMEPLAY.INVENTORY
  // Parent GAMEPLAY should NOT re-enter or exit!
  // Expected order: EXIT_COMBAT -> ENTER_INVENTORY
  fsm.transitionTo("GAMEPLAY.INVENTORY");
  assert.strictEqual(fsm.getCurrentState(), "GAMEPLAY.INVENTORY");
  assert.deepStrictEqual(executionLog, ["EXIT_COMBAT", "ENTER_INVENTORY"]);
  executionLog.length = 0;

  // Transition from child back to MENU
  // Expected order: EXIT_INVENTORY -> EXIT_GAMEPLAY -> ENTER_MENU
  fsm.transitionTo("MENU");
  assert.strictEqual(fsm.getCurrentState(), "MENU");
  assert.deepStrictEqual(executionLog, ["EXIT_INVENTORY", "EXIT_GAMEPLAY", "ENTER_MENU"]);

  fsm.destroy();
});

test("Condition guards block disallowed transitions", () => {
  let playerHealth = 100;

  const fsm = ArcadeVerse.createStateMachine({
    initial: "ALIVE",
    states: {
      ALIVE: {},
      DEAD: {}
    },
    transitions: [
      {
        from: "ALIVE",
        to: "DEAD",
        event: "TAKE_DAMAGE",
        guard: (payload) => {
          playerHealth -= (payload ? payload.damage : 0);
          return playerHealth <= 0;
        }
      }
    ]
  });

  // Non-lethal hit (damage: 30) -> health=70 -> guard returns false -> remains ALIVE
  const didTransition1 = fsm.trigger("TAKE_DAMAGE", { damage: 30 });
  assert.strictEqual(didTransition1, false);
  assert.strictEqual(fsm.getCurrentState(), "ALIVE");

  // Lethal hit (damage: 80) -> health=-10 -> guard returns true -> transitions to DEAD
  const didTransition2 = fsm.trigger("TAKE_DAMAGE", { damage: 80 });
  assert.strictEqual(didTransition2, true);
  assert.strictEqual(fsm.getCurrentState(), "DEAD");

  fsm.destroy();
});

test("pushState and popState preserve and restore suspended context", () => {
  const fsm = ArcadeVerse.createStateMachine({
    initial: "DUNGEON_LEVEL_3",
    states: {
      DUNGEON_LEVEL_3: {},
      PAUSE_OVERLAY: {},
      SHOP_MODAL: {}
    }
  });

  assert.strictEqual(fsm.getCurrentState(), "DUNGEON_LEVEL_3");
  assert.strictEqual(fsm.getStackDepth(), 0);

  // Push pause menu
  fsm.pushState("PAUSE_OVERLAY", { fromMenuButton: true });
  assert.strictEqual(fsm.getCurrentState(), "PAUSE_OVERLAY");
  assert.strictEqual(fsm.getStackDepth(), 1);

  // Push shop from pause
  fsm.pushState("SHOP_MODAL");
  assert.strictEqual(fsm.getCurrentState(), "SHOP_MODAL");
  assert.strictEqual(fsm.getStackDepth(), 2);

  // Pop shop -> back to pause
  fsm.popState();
  assert.strictEqual(fsm.getCurrentState(), "PAUSE_OVERLAY");
  assert.strictEqual(fsm.getStackDepth(), 1);

  // Pop pause -> back to original dungeon level
  fsm.popState();
  assert.strictEqual(fsm.getCurrentState(), "DUNGEON_LEVEL_3");
  assert.strictEqual(fsm.getStackDepth(), 0);

  fsm.destroy();
});

test("Scoped onUpdate runs for active states during game loop ticks", () => {
  let combatUpdates = 0;
  let menuUpdates = 0;

  const fsm = ArcadeVerse.createStateMachine({
    initial: "MENU",
    states: {
      MENU: {
        onUpdate: () => { menuUpdates++; }
      },
      COMBAT: {
        onUpdate: () => { combatUpdates++; }
      }
    }
  });

  fsm.update(16, 16);
  assert.strictEqual(menuUpdates, 1);
  assert.strictEqual(combatUpdates, 0);

  fsm.transitionTo("COMBAT");
  fsm.update(16, 32);
  fsm.update(16, 48);

  assert.strictEqual(menuUpdates, 1);
  assert.strictEqual(combatUpdates, 2);

  fsm.destroy();
});

test("Teardown halts state updates and cleans up listeners", () => {
  let ticks = 0;
  const fsm = ArcadeVerse.createStateMachine({
    initial: "RUNNING",
    states: {
      RUNNING: {
        onUpdate: () => { ticks++; }
      }
    }
  });

  fsm.update(16, 16);
  assert.strictEqual(ticks, 1);

  fsm.destroy();
  fsm.update(16, 32);
  assert.strictEqual(ticks, 1, "Halted state machine must not execute updates");
  assert.strictEqual(fsm.getCurrentState(), null);
});

test("Ensures zero Unicode emojis in state machine test and implementation", () => {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  const selfContent = fs.readFileSync(__filename, "utf8");
  assert.strictEqual(emojiRegex.test(selfContent), false, "Test file must not contain emojis");

  const sdkPath = path.resolve(__dirname, "../assets/js/arcadeverse-sdk.js");
  const sdkContent = fs.readFileSync(sdkPath, "utf8");
  assert.strictEqual(emojiRegex.test(sdkContent), false, "SDK file must not contain emojis");
});
