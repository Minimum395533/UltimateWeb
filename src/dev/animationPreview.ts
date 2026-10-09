import type {
  MovementFrame,
  MovementFrameDraft,
  MovementState,
} from '../types/frameData.ts';
import type { TrainingMovementState } from '../physics/trainingMovement.ts';

export const IDLE_VARIANCE_MIN_IDLE_FRAMES = 5 * 60;
export const IDLE_VARIANCE_CHANCE_PER_FRAME = 1 / (8 * 60);

export interface IdleVariancePlayback {
  idleFrames: number;
  frameIndex: number | null;
}

export interface MovementAnimationPreviewState {
  idleVariance: IdleVariancePlayback;
  motionState: MovementState | null;
  draftId: string | null;
  frameIndex: number;
}

export interface MovementAnimationPreviewFrame {
  motionState: MovementState;
  draft: MovementFrameDraft;
  frame: MovementFrame;
  frameIndex: number;
}

export const INITIAL_IDLE_VARIANCE_PLAYBACK: IdleVariancePlayback = {
  idleFrames: 0,
  frameIndex: null,
};

export const INITIAL_MOVEMENT_ANIMATION_PREVIEW: MovementAnimationPreviewState = {
  idleVariance: INITIAL_IDLE_VARIANCE_PLAYBACK,
  motionState: null,
  draftId: null,
  frameIndex: 0,
};

export function getTrainingAnimationState(
  movement: TrainingMovementState,
): MovementState {
  if (movement.jumpSquatFramesRemaining > 0) return 'jump-squat';
  if (!movement.isGrounded) {
    if (movement.isFastFalling) return 'fast-fall';
    return Number(movement.velocityY) > 0 ? 'rising' : 'falling';
  }
  return movement.mode;
}

/**
 * Advances a development-only idle-variance clip. After five seconds without
 * movement, each fixed 60 Hz step gets a 1-in-480 chance to start the clip.
 */
export function stepIdleVariancePlayback(
  playback: IdleVariancePlayback,
  isGroundedIdle: boolean,
  frameCount: number,
  random: () => number = Math.random,
  forcePlay = false,
): IdleVariancePlayback {
  if (!isGroundedIdle || frameCount < 1) {
    return { idleFrames: 0, frameIndex: null };
  }

  if (playback.frameIndex !== null) {
    const nextFrame = playback.frameIndex + 1;
    return nextFrame < frameCount
      ? { idleFrames: playback.idleFrames, frameIndex: nextFrame }
      : { idleFrames: 0, frameIndex: null };
  }

  const nextIdleFrames = playback.idleFrames + 1;
  const shouldPlay = forcePlay
    || (
      nextIdleFrames >= IDLE_VARIANCE_MIN_IDLE_FRAMES
      && random() < IDLE_VARIANCE_CHANCE_PER_FRAME
    );
  return shouldPlay
    ? { idleFrames: nextIdleFrames, frameIndex: 0 }
    : { idleFrames: nextIdleFrames, frameIndex: null };
}

export function stepMovementAnimationPreview(
  playback: MovementAnimationPreviewState,
  movement: TrainingMovementState,
  drafts: Partial<Record<MovementState, MovementFrameDraft>>,
  random: () => number = Math.random,
  forceIdleVariance = false,
): {
  playback: MovementAnimationPreviewState;
  animation: MovementAnimationPreviewFrame | null;
} {
  const isGroundedIdle = movement.isGrounded
    && movement.mode === 'idle'
    && movement.inputDirection === 0
    && movement.jumpSquatFramesRemaining === 0;
  const idleVarianceDraft = drafts['idle-variance'];
  const idleVariance = stepIdleVariancePlayback(
    playback.idleVariance,
    isGroundedIdle,
    idleVarianceDraft?.frames.length ?? 0,
    random,
    forceIdleVariance,
  );
  const motionState = idleVariance.frameIndex === null
    ? getTrainingAnimationState(movement)
    : 'idle-variance';
  const draft = drafts[motionState];
  if (!draft?.frames.length) {
    return {
      playback: {
        idleVariance,
        motionState: null,
        draftId: null,
        frameIndex: 0,
      },
      animation: null,
    };
  }

  const frameIndex = motionState === 'idle-variance'
    ? idleVariance.frameIndex ?? 0
    : playback.motionState === motionState && playback.draftId === draft.id
      ? (playback.frameIndex + 1) % draft.frames.length
      : 0;
  return {
    playback: {
      idleVariance,
      motionState,
      draftId: draft.id,
      frameIndex,
    },
    animation: {
      motionState,
      draft,
      frame: draft.frames[frameIndex],
      frameIndex,
    },
  };
}
