import {
  canChooseLedgeOption,
  chooseLedgeOption,
  createLedgeRecoveryState,
  detectLedgeGrab,
  grabLedge,
  ledgeHangLimit,
  LEDGE_ANIMATION_IDS,
  snapLedgePosition,
  stepLedge,
} from './ledgeRecovery.ts';
import type { LedgeOption, LedgeRecoveryState } from './ledgeRecovery.ts';
import { unitsPerFrame, worldUnits } from './units.ts';
import type { TrainingMovementState } from './trainingMovement.ts';

export interface LocalMatchLedgeInput {
  jumpPressed: boolean;
  attackPressed: boolean;
  shieldHeld: boolean;
  vertical: number;
  horizontal: number;
}

export interface LocalMatchLedgeStep {
  state: LedgeRecoveryState;
  movement: TrainingMovementState;
  animationId: string | null;
  grabbed: boolean;
  completedOption: LedgeOption | null;
}

function chooseOption(
  state: LedgeRecoveryState,
  input: LocalMatchLedgeInput,
): LedgeOption | null {
  if (!canChooseLedgeOption(state)) return null;
  if (input.jumpPressed) return 'jump';
  if (input.attackPressed) return 'attack';
  if (input.shieldHeld) return 'roll';
  if (input.vertical > 0.65) return 'getup';
  if (input.vertical < -0.65 || input.horizontal * (state.side ?? 0) > 0.75) return 'drop';
  return null;
}

export function advanceLocalMatchLedge(
  state: LedgeRecoveryState,
  movement: TrainingMovementState,
  input: LocalMatchLedgeInput,
  percent: number,
): LocalMatchLedgeStep {
  if (state.side === null) {
    if (movement.isGrounded) {
      return {
        state: state.grabCount > 0 ? createLedgeRecoveryState() : { ...state, airtimeFrames: 0 },
        movement,
        animationId: null,
        grabbed: false,
        completedOption: null,
      };
    }

    const falling = { ...state, airtimeFrames: state.airtimeFrames + 1 };
    const side = detectLedgeGrab(
      Number(movement.positionX),
      Number(movement.positionY),
      Number(movement.velocityY),
      true,
    );
    if (side === null) {
      return { state: falling, movement, animationId: null, grabbed: false, completedOption: null };
    }

    const grabbed = grabLedge(falling, side, falling.airtimeFrames, percent);
    if (!grabbed) {
      return { state: falling, movement, animationId: null, grabbed: false, completedOption: null };
    }
    return {
      state: grabbed,
      movement: {
        ...movement,
        positionX: snapLedgePosition(side),
        positionY: worldUnits(0),
        velocityX: unitsPerFrame(0),
        velocityY: unitsPerFrame(0),
        isGrounded: false,
        facingDirection: side === 1 ? -1 : 1,
      },
      animationId: 'ledge-catch',
      grabbed: true,
      completedOption: null,
    };
  }

  const selected = chooseOption(state, input);
  const started = selected ? chooseLedgeOption(state, selected) : state;
  const animationId = selected ? LEDGE_ANIMATION_IDS[selected] : null;
  const next = stepLedge(started);

  if (started.option && next.side === null) {
    const side = started.side!;
    const action = started.option;
    const offset = action === 'roll' ? 14 : 4;
    return {
      state: { ...createLedgeRecoveryState(), grabCount: next.grabCount, airtimeFrames: next.airtimeFrames },
      movement: {
        ...movement,
        positionX: worldUnits(Number(snapLedgePosition(side)) + side * (action === 'drop' ? 9 : -offset)),
        positionY: worldUnits(action === 'jump' || action === 'drop' ? -1 : 0),
        velocityY: unitsPerFrame(action === 'jump' ? 4 : action === 'drop' ? -1 : 0),
        velocityX: unitsPerFrame(0),
        isGrounded: action !== 'jump' && action !== 'drop',
        jumpsUsed: action === 'jump' ? 1 : movement.jumpsUsed,
      },
      animationId,
      grabbed: false,
      completedOption: action,
    };
  }

  if (next.option === null && next.hangFrames >= ledgeHangLimit(percent)) {
    const side = next.side!;
    return {
      state: { ...createLedgeRecoveryState(), grabCount: next.grabCount, airtimeFrames: next.airtimeFrames },
      movement: {
        ...movement,
        positionX: worldUnits(Number(snapLedgePosition(side)) + side * 9),
        positionY: worldUnits(-1),
        velocityY: unitsPerFrame(-1),
        isGrounded: false,
      },
      animationId,
      grabbed: false,
      completedOption: 'drop',
    };
  }

  return { state: next, movement, animationId, grabbed: false, completedOption: null };
}
