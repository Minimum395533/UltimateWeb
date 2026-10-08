import type { PlayerControllerSettings } from '../types';

export const DEFAULT_CONTROLLER_SETTINGS: PlayerControllerSettings = {
  stickJumpEnabled: true,
  stickSensitivity: 50,
};

export const MIN_STICK_SENSITIVITY = 0;
export const MAX_STICK_SENSITIVITY = 100;
export const MIN_FAST_INPUT_WINDOW_FRAMES = 2;
export const MAX_FAST_INPUT_WINDOW_FRAMES = 8;
export const STICK_JUMP_THRESHOLD = 0.65;

export function normalizeControllerSettings(value: unknown): PlayerControllerSettings {
  const settings = value && typeof value === 'object'
    ? value as Partial<PlayerControllerSettings>
    : {};
  const sensitivity = typeof settings.stickSensitivity === 'number'
    && Number.isFinite(settings.stickSensitivity)
    ? Math.round(settings.stickSensitivity)
    : DEFAULT_CONTROLLER_SETTINGS.stickSensitivity;

  return {
    stickJumpEnabled: typeof settings.stickJumpEnabled === 'boolean'
      ? settings.stickJumpEnabled
      : DEFAULT_CONTROLLER_SETTINGS.stickJumpEnabled,
    stickSensitivity: Math.max(
      MIN_STICK_SENSITIVITY,
      Math.min(MAX_STICK_SENSITIVITY, sensitivity),
    ),
  };
}

export function getFastInputWindowFrames(settings: PlayerControllerSettings): number {
  const sensitivity = Math.max(
    MIN_STICK_SENSITIVITY,
    Math.min(MAX_STICK_SENSITIVITY, settings.stickSensitivity),
  );
  const range = MAX_FAST_INPUT_WINDOW_FRAMES - MIN_FAST_INPUT_WINDOW_FRAMES;
  return Math.round(
    MIN_FAST_INPUT_WINDOW_FRAMES + (sensitivity / MAX_STICK_SENSITIVITY) * range,
  );
}

export function shouldTriggerStickJump(
  verticalAxis: number,
  settings: PlayerControllerSettings,
): boolean {
  return settings.stickJumpEnabled
    && Number.isFinite(verticalAxis)
    && verticalAxis <= -STICK_JUMP_THRESHOLD;
}
