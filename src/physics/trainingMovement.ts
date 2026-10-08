import {
  unitsPerFrame,
  unitsPerFrameSquared,
  worldUnits,
} from './units.ts';
import type { WorldUnit, WorldUnitsPerFrame } from './units.ts';
import { getFastInputWindowFrames } from './controllerSettings.ts';
import type { PlayerControllerSettings } from '../types';
import type { TrainingControlInput } from './trainingInput';

export const TRAINING_SIMULATION_HZ = 60;
export const TRAINING_STEP_MILLISECONDS = 1000 / TRAINING_SIMULATION_HZ;
export const TRAINING_STAGE_WIDTH = worldUnits(160);
export const TRAINING_STAGE_HALF_WIDTH = worldUnits(Number(TRAINING_STAGE_WIDTH) / 2);
export const TRAINING_BLASTZONE_BOUNDS = {
  left: worldUnits(-240),
  right: worldUnits(240),
  bottom: worldUnits(-140),
  top: worldUnits(179),
} as const;
export const TRAINING_CAMERA_LIMITS = {
  left: worldUnits(-180),
  right: worldUnits(180),
  bottom: worldUnits(-60),
  top: worldUnits(130),
} as const;
export const FULL_TILT_THRESHOLD = 0.94;
export const DASH_CONTINUE_THRESHOLD = 0.75;

export const CAPTAIN_FALCON_MOVEMENT = {
  walkSpeed: unitsPerFrame(0.987),
  runSpeed: unitsPerFrame(2.552),
  initialDashSpeed: unitsPerFrame(1.98),
  dashFrames: 15,
  pivotDashFrames: 17,
  baseAcceleration: unitsPerFrameSquared(0.11),
  additionalAcceleration: unitsPerFrameSquared(0.066),
  maxAcceleration: unitsPerFrameSquared(0.176),
  gravity: unitsPerFrameSquared(0.12),
  fallSpeed: unitsPerFrame(1.865),
  fastFallSpeed: unitsPerFrame(2.984),
  regularDashAccelerationDelayFrames: 1,
  turnaroundDashAccelerationDelayFrames: 3,
  jumpSquatFrames: 3,
  fullHopHeight: worldUnits(37.31),
  jumpInitialHeight: worldUnits(20.5205),
  jumpInitialHeightFrames: 4,
  shortHopHeight: worldUnits(17.98),
  airJumpHeight: worldUnits(37.31),
  maxAirJumps: 1,
} as const;

export type MovementMode =
  | 'idle'
  | 'walk'
  | 'initial-dash'
  | 'run'
  | 'turnaround-dash';

export type WalkBand = 0 | 1 | 2 | 3;

export interface TrainingMovementState {
  positionX: WorldUnit;
  velocityX: WorldUnitsPerFrame;
  positionY: WorldUnit;
  velocityY: WorldUnitsPerFrame;
  isGrounded: boolean;
  isFastFalling: boolean;
  mode: MovementMode;
  facingDirection: -1 | 1;
  inputDirection: -1 | 0 | 1;
  framesInDirection: number;
  framesInPhase: number;
  walkBand: WalkBand;
  jumpInputHeld: boolean;
  jumpSquatFramesRemaining: number;
  shortHopRequested: boolean;
  jumpsUsed: number;
  jumpInitialFramesRemaining: number;
  stickJumpAction: boolean;
}

export interface TrainingCameraPosition {
  positionX: WorldUnit;
  positionY: WorldUnit;
}

export function getTrainingCameraPosition(
  fighterX: WorldUnit,
  fighterY: WorldUnit,
): TrainingCameraPosition {
  return {
    positionX: worldUnits(Math.max(
      Number(TRAINING_CAMERA_LIMITS.left),
      Math.min(Number(TRAINING_CAMERA_LIMITS.right), Number(fighterX)),
    )),
    positionY: worldUnits(Math.max(
      Number(TRAINING_CAMERA_LIMITS.bottom),
      Math.min(Number(TRAINING_CAMERA_LIMITS.top), Number(fighterY)),
    )),
  };
}

export function createInitialTrainingMovementState(): TrainingMovementState {
  return {
    positionX: worldUnits(0),
    velocityX: unitsPerFrame(0),
    positionY: worldUnits(0),
    velocityY: unitsPerFrame(0),
    isGrounded: true,
    isFastFalling: false,
    mode: 'idle',
    facingDirection: 1,
    inputDirection: 0,
    framesInDirection: 0,
    framesInPhase: 0,
    walkBand: 0,
    jumpInputHeld: false,
    jumpSquatFramesRemaining: 0,
    shortHopRequested: false,
    jumpsUsed: 0,
    jumpInitialFramesRemaining: 0,
    stickJumpAction: false,
  };
}

function moveToward(
  current: number,
  target: number,
  acceleration: number,
): WorldUnitsPerFrame {
  const difference = target - current;
  const step = Math.min(Math.abs(difference), acceleration);
  return unitsPerFrame(current + Math.sign(difference) * step);
}

function advancePosition(
  position: WorldUnit,
  velocity: WorldUnitsPerFrame,
): { positionX: WorldUnit; velocityX: WorldUnitsPerFrame } {
  return {
    positionX: worldUnits(Number(position) + Number(velocity)),
    velocityX: velocity,
  };
}

function isOutsideTrainingBlastzone(positionX: WorldUnit, positionY: WorldUnit): boolean {
  return Number(positionX) < Number(TRAINING_BLASTZONE_BOUNDS.left)
    || Number(positionX) > Number(TRAINING_BLASTZONE_BOUNDS.right)
    || Number(positionY) < Number(TRAINING_BLASTZONE_BOUNDS.bottom)
    || Number(positionY) > Number(TRAINING_BLASTZONE_BOUNDS.top);
}

function launchVelocityForHeight(height: number, gravity: number): number {
  if (!Number.isFinite(height) || height <= 0 || !Number.isFinite(gravity) || gravity <= 0) {
    throw new RangeError('Jump height and gravity must be finite positive values');
  }

  for (let frames = 1; frames <= 2000; frames += 1) {
    const velocity = height / frames + gravity * (frames + 1) / 2;
    if (velocity >= gravity * frames && velocity < gravity * (frames + 1)) {
      return velocity;
    }
  }

  throw new RangeError('Jump height exceeds the supported frame range');
}

const FULL_HOP_INITIAL_PHASE = (() => {
  const initialHeight = Number(CAPTAIN_FALCON_MOVEMENT.jumpInitialHeight);
  const remainingHeight =
    Number(CAPTAIN_FALCON_MOVEMENT.fullHopHeight) - initialHeight;
  const frames = CAPTAIN_FALCON_MOVEMENT.jumpInitialHeightFrames;
  const endVelocity = launchVelocityForHeight(
    remainingHeight,
    Number(CAPTAIN_FALCON_MOVEMENT.gravity),
  );
  const deceleration =
    (2 * (initialHeight - frames * endVelocity)) / (frames * (frames + 1));

  if (deceleration <= 0) {
    throw new RangeError('Initial jump height must produce a rising launch phase');
  }

  return {
    launchVelocity: endVelocity + frames * deceleration,
    deceleration,
  };
})();

function advanceVerticalMovement(
  state: TrainingMovementState,
  input: TrainingControlInput,
): TrainingMovementState {
  const jumpHeld = Boolean(input.jumpHeld || input.stickJumpAction);
  const jumpPressed = Boolean(input.jumpPressed || (jumpHeld && !state.jumpInputHeld));
  const inputState = {
    ...state,
    jumpInputHeld: jumpHeld,
    stickJumpAction: input.stickJumpAction,
  };
  const respawn = () => ({
    ...createInitialTrainingMovementState(),
    jumpInputHeld: jumpHeld,
    stickJumpAction: input.stickJumpAction,
  });

  if (isOutsideTrainingBlastzone(state.positionX, state.positionY)) {
    return respawn();
  }

  const supported = Math.abs(Number(state.positionX)) <= Number(TRAINING_STAGE_HALF_WIDTH);
  if (state.jumpSquatFramesRemaining > 0) {
    const shortHopRequested = state.shortHopRequested || !jumpHeld;
    const jumpSquatFramesRemaining = state.jumpSquatFramesRemaining - 1;
    const squatState = {
      ...inputState,
      jumpSquatFramesRemaining,
      shortHopRequested,
      positionY: worldUnits(0),
      velocityY: unitsPerFrame(0),
      isGrounded: true,
      isFastFalling: false,
    };

    if (jumpSquatFramesRemaining === 0) {
      const height = shortHopRequested
        ? Number(CAPTAIN_FALCON_MOVEMENT.shortHopHeight)
        : Number(CAPTAIN_FALCON_MOVEMENT.fullHopHeight);
      const useInitialHeight = !shortHopRequested;
      const launchVelocity = useInitialHeight
        ? FULL_HOP_INITIAL_PHASE.launchVelocity
        : launchVelocityForHeight(
          height,
          Number(CAPTAIN_FALCON_MOVEMENT.gravity),
        );
      return {
        ...squatState,
        velocityY: unitsPerFrame(launchVelocity),
        isGrounded: false,
        jumpsUsed: 1,
        shortHopRequested: false,
        jumpInitialFramesRemaining: useInitialHeight
          ? CAPTAIN_FALCON_MOVEMENT.jumpInitialHeightFrames
          : 0,
      };
    }

    return squatState;
  }

  if (jumpPressed && state.isGrounded && supported) {
    return {
      ...inputState,
      positionY: worldUnits(0),
      velocityY: unitsPerFrame(0),
      isGrounded: true,
      isFastFalling: false,
      jumpSquatFramesRemaining: CAPTAIN_FALCON_MOVEMENT.jumpSquatFrames,
      shortHopRequested: false,
      jumpsUsed: 0,
      jumpInitialFramesRemaining: 0,
    };
  }

  if (state.isGrounded && supported) {
    return {
      ...inputState,
      positionY: worldUnits(0),
      velocityY: unitsPerFrame(0),
      isGrounded: true,
      isFastFalling: false,
      jumpSquatFramesRemaining: 0,
      shortHopRequested: false,
      jumpsUsed: 0,
      jumpInitialFramesRemaining: 0,
    };
  }

  let airborneState = inputState;
  if (state.isGrounded || airborneState.jumpsUsed === 0) {
    airborneState = {
      ...airborneState,
      isGrounded: false,
      jumpsUsed: Math.max(1, airborneState.jumpsUsed),
    };
  }

  const airJumpsUsed = Math.max(0, airborneState.jumpsUsed - 1);
  if (jumpPressed && airJumpsUsed < CAPTAIN_FALCON_MOVEMENT.maxAirJumps) {
    return {
      ...airborneState,
      velocityY: unitsPerFrame(launchVelocityForHeight(
        Number(CAPTAIN_FALCON_MOVEMENT.airJumpHeight),
        Number(CAPTAIN_FALCON_MOVEMENT.gravity),
      )),
      isGrounded: false,
      isFastFalling: false,
      jumpsUsed: airborneState.jumpsUsed + 1,
      jumpSquatFramesRemaining: 0,
      shortHopRequested: false,
      jumpInitialFramesRemaining: 0,
    };
  }

  let velocityY: number;
  let positionY: number;
  let jumpInitialFramesRemaining = airborneState.jumpInitialFramesRemaining;
  if (jumpInitialFramesRemaining > 0) {
    velocityY =
      Number(airborneState.velocityY) - FULL_HOP_INITIAL_PHASE.deceleration;
    positionY = Number(airborneState.positionY) + Number(airborneState.velocityY);
    jumpInitialFramesRemaining -= 1;
  } else {
    const fastFalling = input.downHeld && Number(airborneState.velocityY) <= 0;
    const fallSpeed = fastFalling
      ? Number(CAPTAIN_FALCON_MOVEMENT.fastFallSpeed)
      : Number(CAPTAIN_FALCON_MOVEMENT.fallSpeed);
    velocityY = Math.max(
      -fallSpeed,
      Number(airborneState.velocityY) - Number(CAPTAIN_FALCON_MOVEMENT.gravity),
    );
    positionY = Number(airborneState.positionY) + velocityY;
  }

  if (!airborneState.isGrounded && Number(airborneState.positionY) > 0 && positionY <= 0 && supported) {
    return {
      ...airborneState,
      positionY: worldUnits(0),
      velocityY: unitsPerFrame(0),
      isGrounded: true,
      isFastFalling: false,
      jumpsUsed: 0,
      jumpSquatFramesRemaining: 0,
      shortHopRequested: false,
      jumpInitialFramesRemaining: 0,
    };
  }

  const nextState = {
    ...airborneState,
    positionY: worldUnits(positionY),
    velocityY: unitsPerFrame(velocityY),
    isGrounded: false,
    isFastFalling: input.downHeld && velocityY < 0,
    jumpInitialFramesRemaining,
  };
  if (isOutsideTrainingBlastzone(nextState.positionX, nextState.positionY)) {
    return respawn();
  }

  return nextState;
}

function walkBandForMagnitude(magnitude: number): WalkBand {
  if (magnitude <= 0) return 0;
  if (magnitude < 1 / 3) return 1;
  if (magnitude < 2 / 3) return 2;
  return 3;
}

function accelerationForMagnitude(magnitude: number): number {
  const acceleration =
    Number(CAPTAIN_FALCON_MOVEMENT.baseAcceleration)
    + Number(CAPTAIN_FALCON_MOVEMENT.additionalAcceleration) * magnitude;
  return Math.min(Number(CAPTAIN_FALCON_MOVEMENT.maxAcceleration), acceleration);
}

function startDash(
  state: TrainingMovementState,
  direction: -1 | 1,
  turnaround: boolean,
  input: TrainingControlInput,
  framesInDirection: number,
): TrainingMovementState {
  return {
    ...state,
    mode: turnaround ? 'turnaround-dash' : 'initial-dash',
    velocityX: turnaround ? unitsPerFrame(0) : state.velocityX,
    facingDirection: direction,
    inputDirection: direction,
    framesInDirection,
    // The input transition is the first frame of the dash animation.
    framesInPhase: 1,
    walkBand: 0,
    stickJumpAction: input.stickJumpAction,
  };
}

export function stepTrainingMovement(
  state: TrainingMovementState,
  input: TrainingControlInput,
  settings: PlayerControllerSettings,
): TrainingMovementState {
  const horizontal = Math.max(-1, Math.min(1, Number.isFinite(input.horizontal) ? input.horizontal : 0));
  const magnitude = Math.abs(horizontal);
  const direction = Math.sign(horizontal) as -1 | 0 | 1;

  if (direction === 0 || magnitude < 0.01) {
    return advanceVerticalMovement({
      ...state,
      velocityX: unitsPerFrame(0),
      mode: 'idle',
      inputDirection: 0,
      framesInDirection: 0,
      framesInPhase: 0,
      walkBand: 0,
      stickJumpAction: input.stickJumpAction,
    }, input);
  }

  const directionChanged = direction !== state.inputDirection;
  const framesInDirection = directionChanged ? 1 : state.framesInDirection + 1;
  const fullTilt = magnitude >= FULL_TILT_THRESHOLD;
  const quickInput = input.isDigital
    || (fullTilt && framesInDirection <= getFastInputWindowFrames(settings));
  const turnaround = directionChanged
    && state.inputDirection !== 0
    && Math.abs(Number(state.velocityX)) > 0;

  if (directionChanged && quickInput) {
    return advanceVerticalMovement(
      startDash(state, direction, turnaround, input, framesInDirection),
      input,
    );
  }

  const dashMode = state.mode === 'initial-dash' || state.mode === 'turnaround-dash';
  if (
    dashMode
    && direction === state.inputDirection
    && magnitude >= DASH_CONTINUE_THRESHOLD
  ) {
    const isTurnaroundDash = state.mode === 'turnaround-dash';
    const delayFrames = isTurnaroundDash
      ? CAPTAIN_FALCON_MOVEMENT.turnaroundDashAccelerationDelayFrames
      : CAPTAIN_FALCON_MOVEMENT.regularDashAccelerationDelayFrames;
    const dashFrames = isTurnaroundDash
      ? CAPTAIN_FALCON_MOVEMENT.pivotDashFrames
      : CAPTAIN_FALCON_MOVEMENT.dashFrames;
    const acceleration = accelerationForMagnitude(magnitude);
    const velocityX = state.framesInPhase < delayFrames
      ? state.velocityX
      : moveToward(
        Number(state.velocityX),
        direction * Number(CAPTAIN_FALCON_MOVEMENT.initialDashSpeed),
        acceleration,
      );
    const moved = advancePosition(state.positionX, velocityX);
    const framesInPhase = state.framesInPhase + 1;

    return advanceVerticalMovement({
      ...state,
      ...moved,
      velocityX: moved.velocityX,
      mode: framesInPhase >= dashFrames ? 'run' : state.mode,
      facingDirection: direction,
      inputDirection: direction,
      framesInDirection,
      framesInPhase,
      walkBand: 0,
      stickJumpAction: input.stickJumpAction,
    }, input);
  }

  const walking = magnitude < FULL_TILT_THRESHOLD;
  const targetSpeed = walking
    ? Number(CAPTAIN_FALCON_MOVEMENT.walkSpeed) * magnitude
    : Number(CAPTAIN_FALCON_MOVEMENT.runSpeed);
  const velocityX = moveToward(
    Number(state.velocityX),
    direction * targetSpeed,
    accelerationForMagnitude(magnitude),
  );
  const moved = advancePosition(state.positionX, velocityX);

  return advanceVerticalMovement({
    ...state,
    ...moved,
    velocityX: moved.velocityX,
    mode: walking ? 'walk' : 'run',
    facingDirection: direction,
    inputDirection: direction,
    framesInDirection,
    framesInPhase: 0,
    walkBand: walking ? walkBandForMagnitude(magnitude) : 0,
    stickJumpAction: input.stickJumpAction,
  }, input);
}
