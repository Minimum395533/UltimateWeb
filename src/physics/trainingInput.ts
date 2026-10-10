import {
  DEFAULT_KEYBINDS_GAMEPAD,
  DEFAULT_KEYBINDS_KEYBOARD_P1,
} from '../types/index.ts';
import type { ButtonAction, ControllerType, InputBinding, PlayerButtonSettings, PlayerKeybinds } from '../types';
import {
  getDefaultButtonActions,
  normalizeControllerSettings,
  shouldTriggerStickJump,
} from './controllerSettings.ts';

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
  /** Hold down while airborne to reach the character's fast-fall speed. */
  downHeld: boolean;
  /** One-frame keyboard press edge, including taps shorter than a simulation frame. */
  jumpPressed: boolean;
  /** Held state from either configured jump button or enabled stick jump. */
  jumpHeld: boolean;
  /** Enabled up-stick input, exposed separately for the training readout. */
  stickJumpAction: boolean;
  actions: {
    attack: boolean;
    special: boolean;
    smash: boolean;
    tilt: boolean;
    shield: boolean;
    grab: boolean;
    jump: boolean;
    tauntUp: boolean;
    tauntSide: boolean;
    tauntDown: boolean;
  };
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
  input: 'left' | 'right' | 'down' | 'jump' | 'jumpAlt',
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
  newlyPressedKeys: ReadonlySet<string> = new Set(),
  buttonSettings?: PlayerButtonSettings,
  controllerType: ControllerType = 'pro',
): TrainingControlInput {
  const gamepad = gamepads.find((pad): pad is GamepadSnapshot => pad !== null) ?? null;
  const settings = normalizeControllerSettings(controllerSettings);

  const leftKeyboard = readBinding(getBinding(bindings, 'keyboard', 'left'), pressedKeys, null);
  const rightKeyboard = readBinding(getBinding(bindings, 'keyboard', 'right'), pressedKeys, null);
  const leftGamepad = readBinding(getBinding(bindings, 'gamepad', 'left'), pressedKeys, gamepad);
  const rightGamepad = readBinding(getBinding(bindings, 'gamepad', 'right'), pressedKeys, gamepad);
  const downKeyboard = readBinding(getBinding(bindings, 'keyboard', 'down'), pressedKeys, null);
  const downGamepad = readBinding(getBinding(bindings, 'gamepad', 'down'), pressedKeys, gamepad);
  const jumpKeyboardBinding = getBinding(bindings, 'keyboard', 'jump');
  const jumpAltKeyboardBinding = getBinding(bindings, 'keyboard', 'jumpAlt');
  const jumpKeyboard = readBinding(jumpKeyboardBinding, pressedKeys, null);
  const jumpAltKeyboard = readBinding(jumpAltKeyboardBinding, pressedKeys, null);
  const actionMap = { ...getDefaultButtonActions(controllerType), ...(buttonSettings?.[controllerType] ?? {}) };
  const gamepadPhysicalButton: Record<string, number> = {
    B: 0, A: 1, Y: 2, X: 3, L: 4, R: 5, ZL: 6, ZR: 7,
    Minus: 8, Plus: 9, L3: 10, R3: 11,
  };
  const keyCodeForPhysical: Record<string, string> = {
    KeyW: 'KeyW', KeyA: 'KeyA', KeyS: 'KeyS', KeyD: 'KeyD', KeyJ: 'KeyJ',
    KeyK: 'KeyK', KeyL: 'KeyL', KeyU: 'KeyU', KeyI: 'KeyI', KeyO: 'KeyO',
    Space: 'Space', Enter: 'Enter',
  };
  const actionPressed = (action: ButtonAction, device: 'keyboard' | 'gamepad') => {
    for (const [physical, assigned] of Object.entries(actionMap)) {
      if (assigned !== action) continue;
      if (device === 'keyboard' && controllerType === 'keyboard') {
        const code = keyCodeForPhysical[physical];
        if (code && pressedKeys.has(code)) return true;
      }
      if (device === 'gamepad' && controllerType !== 'keyboard') {
        if (physical === 'R3' && gamepad && gamepad.axes.length >= 4
          && (Math.abs(gamepad.axes[2]) > 0.65 || Math.abs(gamepad.axes[3]) > 0.65)) return true;
        const index = gamepadPhysicalButton[physical];
        if (index !== undefined && buttonPressed(gamepad, index)) return true;
      }
    }
    return false;
  };
  const jumpActionKeyboard = actionPressed('jump', 'keyboard');
  const jumpActionGamepad = actionPressed('jump', 'gamepad');
  const actions = {
    attack: actionPressed('attack', controllerType === 'keyboard' ? 'keyboard' : 'gamepad'),
    special: actionPressed('special', controllerType === 'keyboard' ? 'keyboard' : 'gamepad'),
    smash: actionPressed('smash', controllerType === 'keyboard' ? 'keyboard' : 'gamepad'),
    tilt: actionPressed('tilt', controllerType === 'keyboard' ? 'keyboard' : 'gamepad'),
    shield: actionPressed('shield', controllerType === 'keyboard' ? 'keyboard' : 'gamepad'),
    grab: actionPressed('grab', controllerType === 'keyboard' ? 'keyboard' : 'gamepad'),
    jump: jumpActionKeyboard || jumpActionGamepad,
    tauntUp: actionPressed('taunt-up', controllerType === 'keyboard' ? 'keyboard' : 'gamepad'),
    tauntSide: actionPressed('taunt-side', controllerType === 'keyboard' ? 'keyboard' : 'gamepad'),
    tauntDown: actionPressed('taunt-down', controllerType === 'keyboard' ? 'keyboard' : 'gamepad'),
  };
  if (settings.abSmashEnabled && actions.attack && actions.special) actions.smash = true;
  const jumpGamepad = readBinding(getBinding(bindings, 'gamepad', 'jump'), pressedKeys, gamepad);
  const jumpAltGamepad = readBinding(getBinding(bindings, 'gamepad', 'jumpAlt'), pressedKeys, gamepad);

  const keyboardDirection = rightKeyboard.value - leftKeyboard.value;
  const gamepadButtonDirection =
    (rightGamepad.isAnalog ? 0 : rightGamepad.value)
    - (leftGamepad.isAnalog ? 0 : leftGamepad.value);
  const dpadDirection = Number(buttonPressed(gamepad, 15)) - Number(buttonPressed(gamepad, 14));
  const digitalDirection = keyboardDirection + gamepadButtonDirection + dpadDirection;
  const gamepadDownHeld = downGamepad.isAnalog
    ? applyAnalogDeadzone(downGamepad.value) >= 0.65
    : downGamepad.value > 0;
  const downHeld = downKeyboard.value > 0
    || gamepadDownHeld
    || buttonPressed(gamepad, 13);
  const stickJumpAction = shouldTriggerStickJump(gamepad?.axes[1] ?? 0, settings);
  const jumpPressed = Boolean(
    (jumpKeyboardBinding.keyCode && newlyPressedKeys.has(jumpKeyboardBinding.keyCode))
    || (jumpAltKeyboardBinding.keyCode && newlyPressedKeys.has(jumpAltKeyboardBinding.keyCode)),
  );
  const jumpHeld = (controllerType === 'keyboard' ? jumpActionKeyboard : false)
    || (controllerType !== 'keyboard' ? jumpActionGamepad : false)
    || jumpKeyboard.value > 0
    || jumpAltKeyboard.value > 0
    || jumpGamepad.value > 0
    || jumpAltGamepad.value > 0
    || stickJumpAction;

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
    downHeld,
    jumpPressed,
    jumpHeld,
    stickJumpAction,
    actions,
  };
}
