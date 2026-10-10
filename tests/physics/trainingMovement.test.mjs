import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_CONTROLLER_SETTINGS,
  getSmashFlickWindowFrames,
  normalizeControllerSettings,
} from '../../src/physics/controllerSettings.ts';
import {
  CAPTAIN_FALCON_MOVEMENT,
  TRAINING_BLASTZONE_BOUNDS,
  TRAINING_CAMERA_LIMITS,
  TRAINING_FIGHTER_COLLISION,
  TRAINING_OMEGA_UNDERSIDE_PROFILE,
  TRAINING_STAGE_HALF_WIDTH,
  TRAINING_STAGE_WIDTH,
  createInitialTrainingMovementState,
  getTrainingCameraPosition,
  getTrainingPlatformUndersideAt,
  stepTrainingMovement,
} from '../../src/physics/trainingMovement.ts';
import { unitsPerFrame, worldUnits } from '../../src/physics/units.ts';
import { capsulesOverlap, defaultTrainingHurtboxes, resolveHitboxCollisions } from '../../src/physics/hitboxCollision.ts';
import { resolveAnimationClip } from '../../src/data/falcon/trainingClips.ts';
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

const testCapsule = (id, x, state = 'normal') => ({
  id, start: { x, y: 0, z: 0 }, end: { x, y: 4, z: 0 }, radius: 2, state,
});
const testHitbox = (id, x = 0, overrides = {}) => ({
  id: `hb-${id}`, hitboxId: id, start: { x, y: 0, z: 0 }, end: { x, y: 4, z: 0 },
  radius: 2, hitsGrounded: true, hitsAerial: true, clang: true, rehitRate: 0, ...overrides,
});
const combatant = (id, frame, { hitboxes = [], hurtboxes = [], x = 0, grounded = true, moveId = 'jab' } = {}) => ({
  id, moveId, frame, position: { x, y: 0, z: 0 }, facing: 1, grounded, hitboxes, hurtboxes,
});

test('3D capsule overlap includes radii and depth separation', () => {
  const actor = { position: { x: 0, y: 0, z: 0 }, facing: 1 };
  assert.equal(capsulesOverlap(testCapsule('a', 0), actor, testCapsule('b', 3), actor), true);
  assert.equal(capsulesOverlap(testCapsule('a', 0), actor, { ...testCapsule('b', 0), start: { x: 0, y: 0, z: 5 }, end: { x: 0, y: 4, z: 5 } }, actor), false);
});

test('hitboxes only collide on active frames and choose the lowest hitbox ID', () => {
  const target = combatant('target', 1, { hurtboxes: [testCapsule('body', 4)] });
  const attacker = combatant('p1', 1, { hitboxes: [testHitbox(4), testHitbox(1)] });
  const history = new Map();
  assert.equal(resolveHitboxCollisions([combatant('p1', 1), target], history).hits.length, 0);
  const hit = resolveHitboxCollisions([attacker, target], history).hits[0];
  assert.equal(hit.hitboxId, 1);
});

test('one-hit-per-move lockout and configured rehit intervals are honored', () => {
  const history = new Map();
  const target = combatant('target', 1, { hurtboxes: [testCapsule('body', 4)] });
  const attack = (frame, rate = 0) => combatant('p1', frame, { hitboxes: [testHitbox(1, 0, { rehitRate: rate })] });
  assert.equal(resolveHitboxCollisions([attack(1), target], history).hits.length, 1);
  assert.equal(resolveHitboxCollisions([attack(2), target], history).hits.length, 0);
  history.clear();
  assert.equal(resolveHitboxCollisions([attack(1, 3), target], history).hits.length, 1);
  assert.equal(resolveHitboxCollisions([attack(3, 3), target], history).hits.length, 0);
  assert.equal(resolveHitboxCollisions([attack(4, 3), target], history).hits.length, 1);
});

test('intangible hurts are ignored and invincible contacts are reported without effect', () => {
  const history = new Map();
  const attack = combatant('p1', 1, { hitboxes: [testHitbox(2)] });
  assert.equal(resolveHitboxCollisions([attack, combatant('target', 1, { hurtboxes: [testCapsule('body', 4, 'intangible')] })], history).hits.length, 0);
  const hit = resolveHitboxCollisions([attack, combatant('target', 1, { hurtboxes: [testCapsule('body', 4, 'invincible')] })], history).hits[0];
  assert.equal(hit.effect, 'invincible');
});

test('ground and air targeting filters, and clank versus trade outcomes, are reported', () => {
  const groundedTarget = combatant('grounded', 1, { hurtboxes: [testCapsule('body', 4)] });
  const aerialOnly = combatant('p1', 1, { hitboxes: [testHitbox(1, 0, { hitsGrounded: false })] });
  assert.equal(resolveHitboxCollisions([aerialOnly, groundedTarget], new Map()).hits.length, 0);
  const a = combatant('a', 1, { hitboxes: [testHitbox(1)] });
  const b = combatant('b', 1, { x: 0, hitboxes: [testHitbox(2)] });
  assert.ok(resolveHitboxCollisions([a, b], new Map()).clashes.some((clash) => clash.outcome === 'clank'));
  b.hitboxes = [testHitbox(2, 0, { clang: false })];
  assert.ok(resolveHitboxCollisions([a, b], new Map()).clashes.some((clash) => clash.outcome === 'trade'));
});

test('default hurtbox fallback gives the target and fighter labeled body capsules', () => {
  const fallback = defaultTrainingHurtboxes();
  assert.deepEqual(fallback.map((box) => box.part), ['head', 'torso', 'legs']);
});

test('seeded jab animation hits the stationary training target only on its active frame', () => {
  const jab = resolveAnimationClip('jab-1');
  const target = combatant('training-target', 1, { x: 16, hurtboxes: defaultTrainingHurtboxes() });
  const attackerAtFrame = (frame) => combatant('player-1', frame, {
    moveId: 'jab-test',
    hitboxes: jab.frames[frame - 1].hitboxes,
    hurtboxes: jab.frames[frame - 1].hurtboxes,
  });
  assert.equal(resolveHitboxCollisions([attackerAtFrame(2), target], new Map()).hits.length, 0);
  assert.equal(resolveHitboxCollisions([attackerAtFrame(3), target], new Map()).hits.length, 1);
});

function analog(
  horizontal,
  stickJumpAction = false,
  downHeld = false,
  jumpHeld = stickJumpAction,
  jumpPressed = false,
) {
  return { horizontal, isDigital: false, stickJumpAction, downHeld, jumpHeld, jumpPressed };
}

function digital(horizontal, downHeld = false, jumpHeld = false, jumpPressed = false) {
  return { horizontal, isDigital: true, stickJumpAction: false, downHeld, jumpHeld, jumpPressed };
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

test('the camera follow toggle switches between bounded tracking and a fixed center', () => {
  assert.deepEqual(
    getTrainingCameraPosition(worldUnits(220), worldUnits(160), false),
    { positionX: 0, positionY: 0 },
  );
  assert.deepEqual(
    getTrainingCameraPosition(worldUnits(42), worldUnits(28), true),
    { positionX: 42, positionY: 28 },
  );
});

test('the Omega underside collision profile matches its visible trapezoid', () => {
  assert.equal(Number(TRAINING_FIGHTER_COLLISION.height), 18);
  assert.equal(Number(TRAINING_FIGHTER_COLLISION.halfWidth), 4);
  assert.equal(TRAINING_OMEGA_UNDERSIDE_PROFILE.length, 8);
  assert.equal(Number(getTrainingPlatformUndersideAt(worldUnits(0))), -40);
  assert.ok(Math.abs(Number(getTrainingPlatformUndersideAt(worldUnits(80))) + 3.2) < 1e-9);
  assert.equal(getTrainingPlatformUndersideAt(worldUnits(81)), null);
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
  assert.equal(state.jumpsUsed, 1);
});

test('the bean collides with the Omega underside when jumping up from below', () => {
  const state = stepTrainingMovement(
    {
      ...createInitialTrainingMovementState(),
      positionY: worldUnits(-60),
      velocityY: unitsPerFrame(3),
      isGrounded: false,
      jumpsUsed: 2,
    },
    analog(0),
    DEFAULT_CONTROLLER_SETTINGS,
  );

  assert.equal(Number(state.positionY), -58);
  assert.equal(Number(state.velocityY), 0);
  assert.equal(state.isGrounded, false);
  assert.equal(state.jumpsUsed, 2);

  const slopedUndersideState = stepTrainingMovement(
    {
      ...createInitialTrainingMovementState(),
      positionX: worldUnits(70),
      positionY: worldUnits(-27),
      velocityY: unitsPerFrame(3),
      isGrounded: false,
      jumpsUsed: 2,
    },
    analog(0),
    DEFAULT_CONTROLLER_SETTINGS,
  );
  assert.ok(Math.abs(Number(slopedUndersideState.positionY) + 26.7) < 1e-9);
  assert.equal(Number(slopedUndersideState.velocityY), 0);
});

test('the bean cannot move horizontally through the Omega sides from underneath', () => {
  const rightSideState = stepTrainingMovement(
    {
      ...createInitialTrainingMovementState(),
      positionX: worldUnits(86),
      velocityX: unitsPerFrame(-2.552),
      positionY: worldUnits(-20),
      isGrounded: false,
      mode: 'run',
      inputDirection: -1,
      framesInDirection: 4,
    },
    digital(-1),
    DEFAULT_CONTROLLER_SETTINGS,
  );
  assert.equal(Number(rightSideState.positionX), 84);
  assert.equal(Number(rightSideState.velocityX), 0);

  const leftSideState = stepTrainingMovement(
    {
      ...createInitialTrainingMovementState(),
      positionX: worldUnits(-86),
      velocityX: unitsPerFrame(2.552),
      positionY: worldUnits(-20),
      isGrounded: false,
      mode: 'run',
      inputDirection: 1,
      framesInDirection: 4,
    },
    digital(1),
    DEFAULT_CONTROLLER_SETTINGS,
  );
  assert.equal(Number(leftSideState.positionX), -84);
  assert.equal(Number(leftSideState.velocityX), 0);

  let slopedSideState = {
    ...createInitialTrainingMovementState(),
    positionX: worldUnits(78),
    velocityX: unitsPerFrame(-2.552),
    positionY: worldUnits(-30),
    isGrounded: false,
    mode: 'run',
    inputDirection: -1,
    framesInDirection: 4,
  };
  slopedSideState = stepTrainingMovement(
    slopedSideState,
    digital(-1),
    DEFAULT_CONTROLLER_SETTINGS,
  );
  slopedSideState = stepTrainingMovement(
    slopedSideState,
    digital(-1),
    DEFAULT_CONTROLLER_SETTINGS,
  );
  assert.ok(Number(slopedSideState.positionX) > 74);
  assert.ok(Number(slopedSideState.positionX) < 75);
  assert.equal(Number(slopedSideState.velocityX), 0);
});

test('walking off a ledge leaves one aerial jump available', () => {
  let state = {
    ...createInitialTrainingMovementState(),
    positionX: worldUnits(Number(TRAINING_STAGE_HALF_WIDTH) + 1),
  };
  state = stepTrainingMovement(state, analog(0), DEFAULT_CONTROLLER_SETTINGS);
  assert.equal(state.isGrounded, false);
  assert.equal(state.jumpsUsed, 1);

  state = stepTrainingMovement(state, digital(0, false, true), DEFAULT_CONTROLLER_SETTINGS);
  assert.equal(state.jumpsUsed, 2);
  assert.ok(Number(state.velocityY) > 0);
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

test('releasing jump during the three-frame squat produces Captain Falcon’s short hop', () => {
  let state = createInitialTrainingMovementState();
  state = stepTrainingMovement(state, digital(0, false, true), DEFAULT_CONTROLLER_SETTINGS);
  assert.equal(state.isGrounded, true);
  assert.equal(state.jumpSquatFramesRemaining, 3);

  for (let frame = 0; frame < CAPTAIN_FALCON_MOVEMENT.jumpSquatFrames; frame += 1) {
    state = stepTrainingMovement(state, digital(0), DEFAULT_CONTROLLER_SETTINGS);
  }

  assert.equal(state.isGrounded, false);
  assert.equal(state.jumpsUsed, 1);
  assert.equal(state.jumpInitialFramesRemaining, 0);

  let peakHeight = Number(state.positionY);
  for (let frame = 0; frame < 70; frame += 1) {
    state = stepTrainingMovement(state, digital(0), DEFAULT_CONTROLLER_SETTINGS);
    peakHeight = Math.max(peakHeight, Number(state.positionY));
    if (state.isGrounded) break;
  }
  assert.ok(Math.abs(peakHeight - Number(CAPTAIN_FALCON_MOVEMENT.shortHopHeight)) < 1e-9);
});

test('holding jump through the squat reaches the full-hop initial height and peak', () => {
  let state = createInitialTrainingMovementState();
  state = stepTrainingMovement(state, digital(0, false, true), DEFAULT_CONTROLLER_SETTINGS);
  for (let frame = 0; frame < CAPTAIN_FALCON_MOVEMENT.jumpSquatFrames; frame += 1) {
    state = stepTrainingMovement(state, digital(0, false, true), DEFAULT_CONTROLLER_SETTINGS);
  }

  assert.equal(state.isGrounded, false);
  assert.equal(state.jumpsUsed, 1);
  assert.equal(state.jumpInitialFramesRemaining, CAPTAIN_FALCON_MOVEMENT.jumpInitialHeightFrames);

  for (let frame = 0; frame < CAPTAIN_FALCON_MOVEMENT.jumpInitialHeightFrames; frame += 1) {
    state = stepTrainingMovement(state, digital(0), DEFAULT_CONTROLLER_SETTINGS);
  }
  assert.ok(Math.abs(Number(state.positionY) - Number(CAPTAIN_FALCON_MOVEMENT.jumpInitialHeight)) < 1e-9);
  assert.equal(state.jumpInitialFramesRemaining, 0);

  let peakHeight = Number(state.positionY);
  for (let frame = 0; frame < 70; frame += 1) {
    state = stepTrainingMovement(state, digital(0), DEFAULT_CONTROLLER_SETTINGS);
    peakHeight = Math.max(peakHeight, Number(state.positionY));
    if (state.isGrounded) break;
  }
  assert.ok(Math.abs(peakHeight - Number(CAPTAIN_FALCON_MOVEMENT.fullHopHeight)) < 1e-9);
});

test('one midair jump resets vertical speed, cannot retrigger while held, and resets on landing', () => {
  let state = createInitialTrainingMovementState();
  state = stepTrainingMovement(state, digital(0, false, true), DEFAULT_CONTROLLER_SETTINGS);
  for (let frame = 0; frame < CAPTAIN_FALCON_MOVEMENT.jumpSquatFrames; frame += 1) {
    state = stepTrainingMovement(state, digital(0, false, true), DEFAULT_CONTROLLER_SETTINGS);
  }
  for (let frame = 0; frame < CAPTAIN_FALCON_MOVEMENT.jumpInitialHeightFrames; frame += 1) {
    state = stepTrainingMovement(state, digital(0), DEFAULT_CONTROLLER_SETTINGS);
  }

  state = stepTrainingMovement(state, digital(0, false, true), DEFAULT_CONTROLLER_SETTINGS);
  assert.equal(state.jumpsUsed, 2);
  assert.ok(Number(state.velocityY) > 0);
  const airJumpVelocity = Number(state.velocityY);

  state = stepTrainingMovement(state, digital(0, false, true), DEFAULT_CONTROLLER_SETTINGS);
  assert.equal(state.jumpsUsed, 2);
  assert.ok(Number(state.velocityY) < airJumpVelocity);

  for (let frame = 0; frame < 120 && !state.isGrounded; frame += 1) {
    state = stepTrainingMovement(state, digital(0), DEFAULT_CONTROLLER_SETTINGS);
  }
  assert.equal(state.isGrounded, true);
  assert.equal(state.jumpsUsed, 0);
});

test('the midair jump reaches its full supplied height above its starting altitude', () => {
  let state = createInitialTrainingMovementState();
  state = stepTrainingMovement(state, digital(0, false, true), DEFAULT_CONTROLLER_SETTINGS);
  for (let frame = 0; frame < CAPTAIN_FALCON_MOVEMENT.jumpSquatFrames; frame += 1) {
    state = stepTrainingMovement(state, digital(0, false, true), DEFAULT_CONTROLLER_SETTINGS);
  }
  for (let frame = 0; frame < CAPTAIN_FALCON_MOVEMENT.jumpInitialHeightFrames; frame += 1) {
    state = stepTrainingMovement(state, digital(0), DEFAULT_CONTROLLER_SETTINGS);
  }

  const airJumpStart = Number(state.positionY);
  state = stepTrainingMovement(state, digital(0, false, true), DEFAULT_CONTROLLER_SETTINGS);
  let peakHeight = Number(state.positionY);
  for (let frame = 0; frame < 70; frame += 1) {
    state = stepTrainingMovement(state, digital(0), DEFAULT_CONTROLLER_SETTINGS);
    peakHeight = Math.max(peakHeight, Number(state.positionY));
    if (state.isGrounded) break;
  }

  assert.ok(
    Math.abs(peakHeight - airJumpStart - Number(CAPTAIN_FALCON_MOVEMENT.airJumpHeight)) < 1e-9,
  );
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

test('Captain Falcon jump data matches the supplied Ultimate heights', () => {
  assert.equal(CAPTAIN_FALCON_MOVEMENT.jumpSquatFrames, 3);
  assert.equal(Number(CAPTAIN_FALCON_MOVEMENT.fullHopHeight), 37.31);
  assert.equal(Number(CAPTAIN_FALCON_MOVEMENT.jumpInitialHeight), 20.5205);
  assert.equal(CAPTAIN_FALCON_MOVEMENT.jumpInitialHeightFrames, 4);
  assert.equal(Number(CAPTAIN_FALCON_MOVEMENT.shortHopHeight), 17.98);
  assert.equal(Number(CAPTAIN_FALCON_MOVEMENT.airJumpHeight), 37.31);
  assert.equal(CAPTAIN_FALCON_MOVEMENT.maxAirJumps, 1);
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

test('sensitivity exposes exact SmashWiki flick windows and stick jump remains independently configurable', () => {
  for (const [sensitivity, expected] of [['low', [5, 3, 7]], ['normal', [6, 4, 8]], ['high', [7, 5, 9]]]) {
    const settings = normalizeControllerSettings({ stickSensitivity: sensitivity });
    assert.deepEqual([
      getSmashFlickWindowFrames(settings, 'forward-smash'),
      getSmashFlickWindowFrames(settings, 'vertical-smash'),
      getSmashFlickWindowFrames(settings, 'side-special'),
    ], expected);
  }

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
  assert.equal(enabled.jumpHeld, true);
  assert.equal(disabled.stickJumpAction, false);
  assert.equal(disabled.jumpHeld, false);

  const buttonStillJumpsWithStickJumpDisabled = readTrainingControlInput(
    {},
    new Set(),
    [createGamepad([0, -0.8], [3])],
    { stickJumpEnabled: false },
  );
  assert.equal(buttonStillJumpsWithStickJumpDisabled.jumpHeld, true);

  const stickJumpBeginsJumpSquat = stepTrainingMovement(
    createInitialTrainingMovementState(),
    enabled,
    DEFAULT_CONTROLLER_SETTINGS,
  );
  assert.equal(stickJumpBeginsJumpSquat.jumpSquatFramesRemaining, 3);

  const disabledStickDoesNotStartJump = stepTrainingMovement(
    createInitialTrainingMovementState(),
    disabled,
    { ...DEFAULT_CONTROLLER_SETTINGS, stickJumpEnabled: false },
  );
  assert.equal(disabledStickDoesNotStartJump.jumpSquatFramesRemaining, 0);
});

test('legacy numeric settings migrate to Low/Normal/High and sensitivity never changes dash movement', () => {
  assert.equal(normalizeControllerSettings({ stickSensitivity: 0 }).stickSensitivity, 'low');
  assert.equal(normalizeControllerSettings({ stickSensitivity: 50 }).stickSensitivity, 'normal');
  assert.equal(normalizeControllerSettings({ stickSensitivity: 100 }).stickSensitivity, 'high');
  const low = normalizeControllerSettings({ stickSensitivity: 'low' });
  const high = normalizeControllerSettings({ stickSensitivity: 'high' });
  const start = createInitialTrainingMovementState();
  const input = { horizontal: 1, isDigital: false, downHeld: false, jumpPressed: false, jumpHeld: false, stickJumpAction: false };
  assert.deepEqual(stepTrainingMovement(start, input, low), stepTrainingMovement(start, input, high));
});

test('training jump reads the configured physical-button action map', () => {
  const remapped = readTrainingControlInput(
    {},
    new Set(),
    [createGamepad([], [1])],
    DEFAULT_CONTROLLER_SETTINGS,
    new Set(),
    { pro: { A: 'jump', X: 'none' } },
    'pro',
  );
  assert.equal(remapped.jumpHeld, true);
  const keyboard = readTrainingControlInput(
    {},
    new Set(['KeyO']),
    [],
    DEFAULT_CONTROLLER_SETTINGS,
    new Set(),
    { keyboard: { KeyO: 'jump', KeyJ: 'none', Space: 'none' } },
    'keyboard',
  );
  assert.equal(keyboard.jumpHeld, true);
});

test('training input exposes assigned attack actions and optional A+B Smash', () => {
  const pad = createGamepad([], [0, 1]);
  const bindings = { pro: { A: 'attack', B: 'special' } };
  const normal = readTrainingControlInput({}, new Set(), [pad], DEFAULT_CONTROLLER_SETTINGS, new Set(), bindings, 'pro');
  assert.equal(normal.actions.attack, true);
  assert.equal(normal.actions.special, true);
  assert.equal(normal.actions.smash, false);
  const abSmash = readTrainingControlInput({}, new Set(), [pad], { ...DEFAULT_CONTROLLER_SETTINGS, abSmashEnabled: true }, new Set(), bindings, 'pro');
  assert.equal(abSmash.actions.smash, true);
});

test('configured keyboard, gamepad, and rebound jump buttons are read as held input', () => {
  const keyboardJump = readTrainingControlInput(
    DEFAULT_KEYBINDS_KEYBOARD_P1,
    new Set(['KeyJ']),
    [],
    DEFAULT_CONTROLLER_SETTINGS,
  );
  assert.equal(keyboardJump.jumpHeld, true);

  const alternateKeyboardJump = readTrainingControlInput(
    DEFAULT_KEYBINDS_KEYBOARD_P1,
    new Set(['Space']),
    [],
    DEFAULT_CONTROLLER_SETTINGS,
  );
  assert.equal(alternateKeyboardJump.jumpHeld, true);

  const gamepadJump = readTrainingControlInput(
    {},
    new Set(),
    [createGamepad([0, 0], [3])],
    DEFAULT_CONTROLLER_SETTINGS,
  );
  assert.equal(gamepadJump.jumpHeld, true);

  const gamepadAlternateJump = readTrainingControlInput(
    {},
    new Set(),
    [createGamepad([0, 0], [2])],
    DEFAULT_CONTROLLER_SETTINGS,
  );
  assert.equal(gamepadAlternateJump.jumpHeld, true);

  const reboundKeyboardJump = readTrainingControlInput(
    { 'keyboard:jump': { device: 'keyboard', keyCode: 'KeyQ' } },
    new Set(['KeyQ']),
    [],
    DEFAULT_CONTROLLER_SETTINGS,
  );
  assert.equal(reboundKeyboardJump.jumpHeld, true);

  const reboundGamepadJump = readTrainingControlInput(
    { 'gamepad:jump': { device: 'gamepad', buttonIndex: 7 } },
    new Set(),
    [createGamepad([0, 0], [7])],
    DEFAULT_CONTROLLER_SETTINGS,
  );
  assert.equal(reboundGamepadJump.jumpHeld, true);
});

test('a keyboard jump tap between fixed updates is queued and still produces a short hop', () => {
  const tap = readTrainingControlInput(
    DEFAULT_KEYBINDS_KEYBOARD_P1,
    new Set(),
    [],
    DEFAULT_CONTROLLER_SETTINGS,
    new Set(['Space']),
  );
  assert.equal(tap.jumpPressed, true);
  assert.equal(tap.jumpHeld, false);

  let state = stepTrainingMovement(
    createInitialTrainingMovementState(),
    tap,
    DEFAULT_CONTROLLER_SETTINGS,
  );
  assert.equal(state.jumpSquatFramesRemaining, 3);

  for (let frame = 0; frame < CAPTAIN_FALCON_MOVEMENT.jumpSquatFrames; frame += 1) {
    state = stepTrainingMovement(state, digital(0), DEFAULT_CONTROLLER_SETTINGS);
  }
  assert.equal(state.isGrounded, false);
  assert.equal(state.jumpsUsed, 1);
  assert.equal(state.jumpInitialFramesRemaining, 0);
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
    { rumbleEnabled: true, abSmashEnabled: false, stickJumpEnabled: false, stickSensitivity: 'high' },
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
  const migratedPlayer = loadAppState(memoryStorage, fallback).players[0];
  assert.equal(migratedPlayer.controllerType, 'pro');
  assert.equal(migratedPlayer.buttonSettings.pro.A, 'attack');
  assert.equal(migratedPlayer.buttonSettings.pro.B, 'special');
  assert.equal(migratedPlayer.buttonSettings.gamecube.Z, 'shield');
  assert.equal(migratedPlayer.buttonSettings.keyboard.KeyJ, 'jump');
});
