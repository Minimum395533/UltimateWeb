import {
  unitsPerFrame,
  unitsPerFrameSquared,
  worldUnits,
} from './units';
import type { WorldUnit, WorldUnitsPerFrame } from './units';
import { getFastInputWindowFrames } from './controllerSettings';
import type { PlayerControllerSettings } from '../types';
import type { TrainingControlInput } from './trainingInput';

export const TRAINING_SIMULATION_HZ = 60;
export const TRAINING_STEP_MILLISECONDS = 1000 / TRAINING_SIMULATION_HZ;
export const TRAINING_STAGE_HALF_WIDTH = worldUnits(50);
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
  mode: MovementMode;
  facingDirection: -1 | 1;
  inputDirection: -1 | 0 | 1;
  framesInDirection: number;
  framesInPhase: number;
  walkBand: WalkBand;
  stickJumpAction: boolean;
}

export function createInitialTrainingMovementState(): TrainingMovementState {
  return {
    positionX: worldUnits(0),
    velocityX: unitsPerFrame(0),
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
  const nextPosition = Number(position) + Number(velocity);
  const boundedPosition = Math.max(
    -Number(TRAINING_STAGE_HALF_WIDTH),
    Math.min(Number(TRAINING_STAGE_HALF_WIDTH), nextPosition),
  );

  return {
    positionX: worldUnits(boundedPosition),
    velocityX: boundedPosition === nextPosition ? velocity : unitsPerFrame(0),
  };
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
    framesInPhase: 0,
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
    return {
      ...state,
      velocityX: unitsPerFrame(0),
      mode: 'idle',
      inputDirection: 0,
      framesInDirection: 0,
      framesInPhase: 0,
      walkBand: 0,
      stickJumpAction: input.stickJumpAction,
    };
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
    return startDash(state, direction, turnaround, input, framesInDirection);
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

    return {
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
    };
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

  return {
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
  };
}
