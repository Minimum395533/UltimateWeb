import {
  DEFAULT_KEYBINDS_GAMEPAD,
  DEFAULT_KEYBINDS_KEYBOARD_P1,
} from '../types';
import type { InputBinding, PlayerKeybinds } from '../types';
import {
  normalizeControllerSettings,
  shouldTriggerStickJump,
} from './controllerSettings';
import type { PlayerControllerSettings } from '../types';

export const GAMEPAD_AXIS_DEADZONE = 0.12;

export interface GamepadSnapshot {
  readonly axes: ArrayLike<number>;
  readonly buttons: ArrayLike<{
    readonly pressed: boolean;
    readonly value: number;
  }>;
}

export interface TrainingControlInput {
  /** Signed horizontal input in [-1, 1]; analog magnitude is retained. */
  horizontal: number;
  /** True for keyboard, D-pad, or button movement; these are always full strength. */
  isDigital: boolean;
  /** Input event only. Training mode does not yet simulate a jump. */
  stickJumpAction: boolean;
}

interface BindingValue {
  value: number;
  isAnalog: boolean;
}

function clampAxis(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-1, Math.min(1, value));
}

export function applyAnalogDeadzone(
  value: number,
  deadzone = GAMEPAD_AXIS_DEADZONE,
): number {
  const axis = clampAxis(value);
  const safeDeadzone = Math.max(0, Math.min(0.95, deadzone));
  const magnitude = Math.abs(axis);
  if (magnitude <= safeDeadzone) return 0;

  return Math.sign(axis) * ((magnitude - safeDeadzone) / (1 - safeDeadzone));
}

function getBinding(
  bindings: PlayerKeybinds,
  device: InputBinding['device'],
  input: 'left' | 'right',
): InputBinding {
  const scopedBinding = bindings[`${device}:${input}`];
  if (scopedBinding?.device === device) return scopedBinding;

  const legacyBinding = bindings[input];
  if (legacyBinding?.device === device) return legacyBinding;

  return device === 'keyboard'
    ? DEFAULT_KEYBINDS_KEYBOARD_P1[input]
    : DEFAULT_KEYBINDS_GAMEPAD[input];
}

function readBinding(
  binding: InputBinding,
  pressedKeys: ReadonlySet<string>,
  gamepad: GamepadSnapshot | null,
): BindingValue {
  if (binding.device === 'keyboard') {
    return {
      value: binding.keyCode && pressedKeys.has(binding.keyCode) ? 1 : 0,
      isAnalog: false,
    };
  }

  if (binding.buttonIndex !== undefined) {
    const button = gamepad?.buttons[binding.buttonIndex];
    return {
      value: button && (button.pressed || button.value >= 0.5) ? 1 : 0,
      isAnalog: false,
    };
  }

  if (binding.axisIndex !== undefined) {
    const rawValue = clampAxis(gamepad?.axes[binding.axisIndex] ?? 0);
    const directedValue = binding.axisDirection === 'negative' ? -rawValue : rawValue;
    return { value: Math.max(0, directedValue), isAnalog: true };
  }

  return { value: 0, isAnalog: false };
}

function buttonPressed(gamepad: GamepadSnapshot | null, index: number): boolean {
  const button = gamepad?.buttons[index];
  return Boolean(button && (button.pressed || button.value >= 0.5));
}

export function readTrainingControlInput(
  bindings: PlayerKeybinds,
  pressedKeys: ReadonlySet<string>,
  gamepads: readonly (GamepadSnapshot | null)[],
  controllerSettings: unknown,
): TrainingControlInput {
  const gamepad = gamepads.find((pad): pad is GamepadSnapshot => pad !== null) ?? null;
  const settings = normalizeControllerSettings(controllerSettings);

  const leftKeyboard = readBinding(getBinding(bindings, 'keyboard', 'left'), pressedKeys, null);
  const rightKeyboard = readBinding(getBinding(bindings, 'keyboard', 'right'), pressedKeys, null);
  const leftGamepad = readBinding(getBinding(bindings, 'gamepad', 'left'), pressedKeys, gamepad);
  const rightGamepad = readBinding(getBinding(bindings, 'gamepad', 'right'), pressedKeys, gamepad);

  const keyboardDirection = rightKeyboard.value - leftKeyboard.value;
  const gamepadButtonDirection =
    (rightGamepad.isAnalog ? 0 : rightGamepad.value)
    - (leftGamepad.isAnalog ? 0 : leftGamepad.value);
  const dpadDirection = Number(buttonPressed(gamepad, 15)) - Number(buttonPressed(gamepad, 14));
  const digitalDirection = keyboardDirection + gamepadButtonDirection + dpadDirection;

  let horizontal: number;
  let isDigital: boolean;
  if (digitalDirection !== 0) {
    horizontal = Math.sign(digitalDirection);
    isDigital = true;
  } else {
    const analogDirection =
      (rightGamepad.isAnalog ? rightGamepad.value : 0)
      - (leftGamepad.isAnalog ? leftGamepad.value : 0);
    horizontal = applyAnalogDeadzone(analogDirection);
    isDigital = false;
  }

  return {
    horizontal,
    isDigital,
    stickJumpAction: shouldTriggerStickJump(gamepad?.axes[1] ?? 0, settings),
  };
}
