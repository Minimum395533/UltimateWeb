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

function advanceVerticalMovement(
  state: TrainingMovementState,
  downHeld: boolean,
): TrainingMovementState {
  if (isOutsideTrainingBlastzone(state.positionX, state.positionY)) {
    return createInitialTrainingMovementState();
  }

  const supported = Math.abs(Number(state.positionX)) <= Number(TRAINING_STAGE_HALF_WIDTH);
  if (state.isGrounded && supported) {
    return {
      ...state,
      positionY: worldUnits(0),
      velocityY: unitsPerFrame(0),
      isGrounded: true,
      isFastFalling: false,
    };
  }

  const fallSpeed = downHeld
    ? Number(CAPTAIN_FALCON_MOVEMENT.fastFallSpeed)
    : Number(CAPTAIN_FALCON_MOVEMENT.fallSpeed);
  const velocityY = Math.max(
    -fallSpeed,
    Number(state.velocityY) - Number(CAPTAIN_FALCON_MOVEMENT.gravity),
  );
  const positionY = Number(state.positionY) + velocityY;

  if (!state.isGrounded && Number(state.positionY) > 0 && positionY <= 0 && supported) {
    return {
      ...state,
      positionY: worldUnits(0),
      velocityY: unitsPerFrame(0),
      isGrounded: true,
      isFastFalling: false,
    };
  }

  const nextState = {
    ...state,
    positionY: worldUnits(positionY),
    velocityY: unitsPerFrame(velocityY),
    isGrounded: false,
    isFastFalling: downHeld,
  };
  if (
    isOutsideTrainingBlastzone(nextState.positionX, nextState.positionY)
  ) {
    return createInitialTrainingMovementState();
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
    }, input.downHeld);
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
      input.downHeld,
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
    }, input.downHeld);
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
  }, input.downHeld);
}
