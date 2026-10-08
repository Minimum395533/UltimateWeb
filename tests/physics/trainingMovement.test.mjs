import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_CONTROLLER_SETTINGS,
  getFastInputWindowFrames,
  normalizeControllerSettings,
} from '../../src/physics/controllerSettings.ts';
import {
  CAPTAIN_FALCON_MOVEMENT,
  TRAINING_BLASTZONE_BOUNDS,
  TRAINING_CAMERA_LIMITS,
  TRAINING_STAGE_HALF_WIDTH,
  TRAINING_STAGE_WIDTH,
  createInitialTrainingMovementState,
  getTrainingCameraPosition,
  stepTrainingMovement,
} from '../../src/physics/trainingMovement.ts';
import { unitsPerFrame, worldUnits } from '../../src/physics/units.ts';
import {
  applyAnalogDeadzone,
  readTrainingControlInput,
} from '../../src/physics/trainingInput.ts';
import {
  loadAppState,
  saveAppState,
  APP_STATE_STORAGE_KEY,
} from '../../src/state/appStateStorage.ts';
import {
  DEFAULT_KEYBINDS_KEYBOARD_P1,
} from '../../src/types/index.ts';

function analog(horizontal, stickJumpAction = false, downHeld = false) {
  return { horizontal, isDigital: false, stickJumpAction, downHeld };
}

function digital(horizontal, downHeld = false) {
  return { horizontal, isDigital: true, stickJumpAction: false, downHeld };
}

function createGamepad(axes = [0, 0], buttonIndexes = []) {
  const buttons = Array.from({ length: 16 }, (_, index) => ({
    pressed: buttonIndexes.includes(index),
    value: buttonIndexes.includes(index) ? 1 : 0,
  }));
  return { axes, buttons };
}

test('training stage bounds match the diagram scaled to the 160-unit Omega platform', () => {
  assert.equal(Number(TRAINING_STAGE_WIDTH), 160);
  assert.equal(Number(TRAINING_STAGE_HALF_WIDTH), 80);
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(TRAINING_BLASTZONE_BOUNDS).map(([edge, value]) => [edge, Number(value)]),
    ),
    { left: -240, right: 240, bottom: -140, top: 179 },
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(TRAINING_CAMERA_LIMITS).map(([edge, value]) => [edge, Number(value)]),
    ),
    { left: -180, right: 180, bottom: -60, top: 130 },
  );
});

test('the camera follows the fighter and clamps within the camera-limit rectangle', () => {
  assert.deepEqual(
    getTrainingCameraPosition(worldUnits(42), worldUnits(28)),
    { positionX: 42, positionY: 28 },
  );
  assert.deepEqual(
    getTrainingCameraPosition(worldUnits(220), worldUnits(160)),
    { positionX: 180, positionY: 130 },
  );
  assert.deepEqual(
    getTrainingCameraPosition(worldUnits(-220), worldUnits(-90)),
    { positionX: -180, positionY: -60 },
  );
});

test('Captain Falcon gravity and normal and fast-fall caps match the supplied values', () => {
  assert.equal(Number(CAPTAIN_FALCON_MOVEMENT.gravity), 0.12);
  assert.equal(Number(CAPTAIN_FALCON_MOVEMENT.fallSpeed), 1.865);
  assert.equal(Number(CAPTAIN_FALCON_MOVEMENT.fastFallSpeed), 2.984);
});

test('down input reads keyboard, analog stick, and D-pad fast-fall controls', () => {
  const keyboardDown = readTrainingControlInput(
    DEFAULT_KEYBINDS_KEYBOARD_P1,
    new Set(['KeyS']),
    [],
    DEFAULT_CONTROLLER_SETTINGS,
  );
  assert.equal(keyboardDown.downHeld, true);

  const stickDown = readTrainingControlInput(
    {},
    new Set(),
    [createGamepad([0, 0.8])],
    DEFAULT_CONTROLLER_SETTINGS,
  );
  assert.equal(stickDown.downHeld, true);

  const stickDrift = readTrainingControlInput(
    {},
    new Set(),
    [createGamepad([0, 0.45])],
    DEFAULT_CONTROLLER_SETTINGS,
  );
  assert.equal(stickDrift.downHeld, false);

  const dpadDown = readTrainingControlInput(
    {},
    new Set(),
    [createGamepad([0, 0], [13])],
    DEFAULT_CONTROLLER_SETTINGS,
  );
  assert.equal(dpadDown.downHeld, true);
});

test('a fighter can walk off an open ledge and begin falling', () => {
  let state = createInitialTrainingMovementState();
  let fellOffRightLedge = false;
  for (let frame = 0; frame < 60; frame += 1) {
    state = stepTrainingMovement(state, digital(1), DEFAULT_CONTROLLER_SETTINGS);
    if (!state.isGrounded && Number(state.positionX) > Number(TRAINING_STAGE_HALF_WIDTH)) {
      fellOffRightLedge = true;
      break;
    }
  }
  assert.equal(fellOffRightLedge, true);
  assert.ok(Number(state.positionY) < 0);
  assert.ok(Number(state.velocityY) < 0);
});

test('normal falling accelerates up to the supplied fall-speed cap', () => {
  let state = {
    ...createInitialTrainingMovementState(),
    positionX: worldUnits(Number(TRAINING_STAGE_HALF_WIDTH) + 1),
  };
  for (let frame = 0; frame < 30; frame += 1) {
    state = stepTrainingMovement(state, analog(0), DEFAULT_CONTROLLER_SETTINGS);
  }
  assert.equal(state.isGrounded, false);
  assert.equal(Number(state.velocityY), -Number(CAPTAIN_FALCON_MOVEMENT.fallSpeed));
  assert.ok(Number(state.positionY) > Number(TRAINING_BLASTZONE_BOUNDS.bottom));
});

test('holding down in the air reaches fast-fall speed and releasing returns to normal cap', () => {
  let state = {
    ...createInitialTrainingMovementState(),
    positionX: worldUnits(Number(TRAINING_STAGE_HALF_WIDTH) + 1),
  };
  for (let frame = 0; frame < 25; frame += 1) {
    state = stepTrainingMovement(state, analog(0, false, true), DEFAULT_CONTROLLER_SETTINGS);
  }
  assert.equal(state.isFastFalling, true);
  assert.equal(Number(state.velocityY), -Number(CAPTAIN_FALCON_MOVEMENT.fastFallSpeed));
  assert.ok(Number(state.positionY) > Number(TRAINING_BLASTZONE_BOUNDS.bottom));

  state = stepTrainingMovement(state, analog(0), DEFAULT_CONTROLLER_SETTINGS);
  assert.equal(state.isFastFalling, false);
  assert.equal(Number(state.velocityY), -Number(CAPTAIN_FALCON_MOVEMENT.fallSpeed));
});

test('down input does not fast-fall while the fighter is supported', () => {
  const state = stepTrainingMovement(
    createInitialTrainingMovementState(),
    analog(0, false, true),
    DEFAULT_CONTROLLER_SETTINGS,
  );
  assert.equal(state.isGrounded, true);
  assert.equal(state.isFastFalling, false);
  assert.equal(Number(state.velocityY), 0);
});

test('crossing any edge of the blastzone respawns the fighter on the platform', () => {
  const initial = createInitialTrainingMovementState();
  const edgeCases = [
    {
      name: 'left',
      state: {
        ...initial,
        positionX: worldUnits(-239.9),
        velocityX: unitsPerFrame(-0.2),
        isGrounded: false,
        mode: 'run',
        inputDirection: -1,
      },
      input: digital(-1),
    },
    {
      name: 'right',
      state: {
        ...initial,
        positionX: worldUnits(239.9),
        velocityX: unitsPerFrame(0.2),
        isGrounded: false,
        mode: 'run',
        inputDirection: 1,
      },
      input: digital(1),
    },
    {
      name: 'top',
      state: {
        ...initial,
        positionY: worldUnits(178.5),
        velocityY: unitsPerFrame(1),
        isGrounded: false,
      },
      input: analog(0),
    },
    {
      name: 'bottom',
      state: {
        ...initial,
        positionY: worldUnits(-139.5),
        velocityY: unitsPerFrame(-1.8),
        isGrounded: false,
      },
      input: analog(0),
    },
  ];

  for (const { name, state: edgeState, input } of edgeCases) {
    const state = stepTrainingMovement(edgeState, input, DEFAULT_CONTROLLER_SETTINGS);
    assert.equal(Number(state.positionX), 0, `${name} edge resets x`);
    assert.equal(Number(state.positionY), 0, `${name} edge resets y`);
    assert.equal(state.isGrounded, true, `${name} edge returns to the platform`);
  }
});

test('Captain Falcon movement values match the supplied Ultimate stats', () => {
  assert.equal(Number(CAPTAIN_FALCON_MOVEMENT.walkSpeed), 0.987);
  assert.equal(Number(CAPTAIN_FALCON_MOVEMENT.runSpeed), 2.552);
  assert.equal(Number(CAPTAIN_FALCON_MOVEMENT.initialDashSpeed), 1.98);
  assert.equal(CAPTAIN_FALCON_MOVEMENT.dashFrames, 15);
  assert.equal(CAPTAIN_FALCON_MOVEMENT.pivotDashFrames, 17);
  assert.equal(Number(CAPTAIN_FALCON_MOVEMENT.baseAcceleration), 0.11);
  assert.equal(Number(CAPTAIN_FALCON_MOVEMENT.additionalAcceleration), 0.066);
  assert.equal(Number(CAPTAIN_FALCON_MOVEMENT.maxAcceleration), 0.176);
});

test('analog stick input preserves push magnitude after deadzone rescaling', () => {
  assert.equal(applyAnalogDeadzone(0), 0);
  assert.equal(applyAnalogDeadzone(0.06), 0);
  assert.ok(Math.abs(applyAnalogDeadzone(0.56) - 0.5) < 1e-12);
  assert.equal(applyAnalogDeadzone(-1), -1);

  const input = readTrainingControlInput(
    {},
    new Set(),
    [createGamepad([0.56, 0])],
    DEFAULT_CONTROLLER_SETTINGS,
  );
  assert.ok(Math.abs(input.horizontal - 0.5) < 1e-12);
  assert.equal(input.isDigital, false);
});

test('keyboard and D-pad movement remain digital full-strength inputs', () => {
  const keyboardInput = readTrainingControlInput(
    DEFAULT_KEYBINDS_KEYBOARD_P1,
    new Set(['KeyD']),
    [],
    DEFAULT_CONTROLLER_SETTINGS,
  );
  assert.deepEqual(
    { horizontal: keyboardInput.horizontal, isDigital: keyboardInput.isDigital },
    { horizontal: 1, isDigital: true },
  );

  const dpadInput = readTrainingControlInput(
    {},
    new Set(),
    [createGamepad([0, 0], [15])],
    DEFAULT_CONTROLLER_SETTINGS,
  );
  assert.equal(dpadInput.horizontal, 1);
  assert.equal(dpadInput.isDigital, true);
});

test('a quick full tilt starts a dash and holding it transitions into a run', () => {
  let state = createInitialTrainingMovementState();
  state = stepTrainingMovement(state, analog(1), DEFAULT_CONTROLLER_SETTINGS);
  assert.equal(state.mode, 'initial-dash');
  assert.equal(state.framesInPhase, 1);

  for (let frame = 1; frame < CAPTAIN_FALCON_MOVEMENT.dashFrames; frame += 1) {
    state = stepTrainingMovement(state, analog(1), DEFAULT_CONTROLLER_SETTINGS);
  }

  assert.equal(state.mode, 'run');
  assert.ok(Number(state.positionX) > 0);
  assert.equal(Number(state.velocityX), Number(CAPTAIN_FALCON_MOVEMENT.initialDashSpeed));
});

test('a slow build to full tilt runs without being misread as a dash flick', () => {
  let state = createInitialTrainingMovementState();
  for (let frame = 0; frame < 10; frame += 1) {
    state = stepTrainingMovement(state, analog(0.5), DEFAULT_CONTROLLER_SETTINGS);
  }

  state = stepTrainingMovement(state, analog(1), DEFAULT_CONTROLLER_SETTINGS);
  assert.equal(state.mode, 'run');
});

test('walk speed scales with stick tilt and reports the three walk bands', () => {
  let state = createInitialTrainingMovementState();
  for (let frame = 0; frame < 8; frame += 1) {
    state = stepTrainingMovement(state, analog(0.2), DEFAULT_CONTROLLER_SETTINGS);
  }
  assert.equal(state.mode, 'walk');
  assert.equal(state.walkBand, 1);
  assert.ok(Math.abs(Number(state.velocityX) - 0.987 * 0.2) < 0.000001);

  for (let frame = 0; frame < 8; frame += 1) {
    state = stepTrainingMovement(state, analog(0.8), DEFAULT_CONTROLLER_SETTINGS);
  }
  assert.equal(state.mode, 'walk');
  assert.equal(state.walkBand, 3);
  assert.ok(Number(state.velocityX) > 0.987 * 0.2);
});

test('turnaround dashes wait three frames before accelerating in the new direction', () => {
  let state = createInitialTrainingMovementState();
  state = stepTrainingMovement(state, digital(1), DEFAULT_CONTROLLER_SETTINGS);
  for (let frame = 0; frame < CAPTAIN_FALCON_MOVEMENT.dashFrames; frame += 1) {
    state = stepTrainingMovement(state, digital(1), DEFAULT_CONTROLLER_SETTINGS);
  }
  assert.ok(Number(state.velocityX) > 0);

  state = stepTrainingMovement(state, digital(-1), DEFAULT_CONTROLLER_SETTINGS);
  assert.equal(state.mode, 'turnaround-dash');
  assert.equal(Number(state.velocityX), 0);

  for (let frame = 1; frame < CAPTAIN_FALCON_MOVEMENT.turnaroundDashAccelerationDelayFrames; frame += 1) {
    state = stepTrainingMovement(state, digital(-1), DEFAULT_CONTROLLER_SETTINGS);
    assert.equal(Number(state.velocityX), 0);
  }
  state = stepTrainingMovement(state, digital(-1), DEFAULT_CONTROLLER_SETTINGS);
  assert.ok(Number(state.velocityX) < 0);
});

test('sensitivity changes the fast-flick window and stick jump emits input only when enabled', () => {
  assert.equal(getFastInputWindowFrames(normalizeControllerSettings({ stickSensitivity: 0 })), 2);
  assert.equal(getFastInputWindowFrames(DEFAULT_CONTROLLER_SETTINGS), 5);
  assert.equal(getFastInputWindowFrames(normalizeControllerSettings({ stickSensitivity: 100 })), 8);

  const enabled = readTrainingControlInput(
    {},
    new Set(),
    [createGamepad([0, -0.8])],
    DEFAULT_CONTROLLER_SETTINGS,
  );
  const disabled = readTrainingControlInput(
    {},
    new Set(),
    [createGamepad([0, -0.8])],
    { stickJumpEnabled: false },
  );
  assert.equal(enabled.stickJumpAction, true);
  assert.equal(disabled.stickJumpAction, false);
});

test('controller options persist and older saved players receive safe defaults', () => {
  const storage = new Map();
  const memoryStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  const defaultPlayer = {
    id: 'player1',
    name: 'Player 1',
    characterId: 'captain_falcon',
    colorIndex: 0,
    keybinds: DEFAULT_KEYBINDS_KEYBOARD_P1,
    controllerSettings: DEFAULT_CONTROLLER_SETTINGS,
    isReady: false,
  };
  const fallback = {
    currentScreen: 'training',
    players: [defaultPlayer],
    selectedPlayerIndex: null,
    gameSettings: { stockCount: 3, timeLimit: 300, damageRatio: 1 },
  };
  const updated = {
    ...fallback,
    players: [{
      ...defaultPlayer,
      controllerSettings: { stickJumpEnabled: false, stickSensitivity: 82 },
    }],
  };

  saveAppState(memoryStorage, updated);
  assert.equal(storage.has(APP_STATE_STORAGE_KEY), true);
  assert.deepEqual(
    loadAppState(memoryStorage, fallback).players[0].controllerSettings,
    { stickJumpEnabled: false, stickSensitivity: 82 },
  );

  const { controllerSettings: _oldSetting, ...legacyPlayer } = defaultPlayer;
  memoryStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify({
    ...fallback,
    players: [legacyPlayer],
  }));
  assert.deepEqual(
    loadAppState(memoryStorage, fallback).players[0].controllerSettings,
    DEFAULT_CONTROLLER_SETTINGS,
  );
});
