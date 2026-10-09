import type { AnimationFrame, MovementState } from '../types/frameData.ts';
import type { TrainingMovementState } from '../physics/trainingMovement.ts';

export const IDLE_VARIANCE_MIN_IDLE_FRAMES = 5 * 60;
export const IDLE_VARIANCE_CHANCE_PER_FRAME = 1 / (8 * 60);

export interface IdleVariancePlayback {
  idleFrames: number;
  frameIndex: number | null;
}

/** Where a training clip came from: the working draft, approved game data, or seeded defaults. */
export type AnimationClipSource = 'draft' | 'approved' | 'default';

export interface AnimationClip {
  /** Changes whenever the clip content changes, so playback restarts. */
  key: string;
  animationId: string;
  source: AnimationClipSource;
  frames: AnimationFrame[];
}

export interface MovementAnimationPreviewState {
  idleVariance: IdleVariancePlayback;
  motionState: MovementState | null;
  clipKey: string | null;
  frameIndex: number;
}

export interface MovementAnimationPreviewFrame {
  motionState: MovementState;
  clip: AnimationClip;
  frame: AnimationFrame;
  frameIndex: number;
}

export const INITIAL_IDLE_VARIANCE_PLAYBACK: IdleVariancePlayback = {
  idleFrames: 0,
  frameIndex: null,
};

export const INITIAL_MOVEMENT_ANIMATION_PREVIEW: MovementAnimationPreviewState = {
  idleVariance: INITIAL_IDLE_VARIANCE_PLAYBACK,
  motionState: null,
  clipKey: null,
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
  clips: Partial<Record<MovementState, AnimationClip>>,
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
  const idleVarianceClip = clips['idle-variance'];
  const idleVariance = stepIdleVariancePlayback(
    playback.idleVariance,
    isGroundedIdle,
    idleVarianceClip?.frames.length ?? 0,
    random,
    forceIdleVariance,
  );
  const motionState = idleVariance.frameIndex === null
    ? getTrainingAnimationState(movement)
    : 'idle-variance';
  const clip = clips[motionState];
  if (!clip?.frames.length) {
    return {
      playback: {
        idleVariance,
        motionState: null,
        clipKey: null,
        frameIndex: 0,
      },
      animation: null,
    };
  }

  const frameIndex = motionState === 'idle-variance'
    ? idleVariance.frameIndex ?? 0
    : playback.motionState === motionState && playback.clipKey === clip.key
      ? (playback.frameIndex + 1) % clip.frames.length
      : 0;
  return {
    playback: {
      idleVariance,
      motionState,
      clipKey: clip.key,
      frameIndex,
    },
    animation: {
      motionState,
      clip,
      frame: clip.frames[Math.min(frameIndex, clip.frames.length - 1)],
      frameIndex,
    },
  };
}
