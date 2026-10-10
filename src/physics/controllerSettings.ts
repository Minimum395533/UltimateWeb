import type { ButtonActionMap, ControllerType, PlayerControllerSettings } from '../types';

// Behavior and layout references: https://www.ssbwiki.com/Controls and
// https://www.ssbwiki.com/Control_stick (Ultimate controls/stick sensitivity).
export const DEFAULT_CONTROLLER_SETTINGS: PlayerControllerSettings = {
  rumbleEnabled: true,
  abSmashEnabled: false,
  stickJumpEnabled: true,
  stickSensitivity: 'normal',
};

export const STICK_JUMP_THRESHOLD = 0.65;
export type SmashFlickKind = 'forward-smash' | 'vertical-smash' | 'side-special';

export function normalizeControllerSettings(value: unknown): PlayerControllerSettings {
  const settings = value && typeof value === 'object'
    ? value as Partial<PlayerControllerSettings> & { stickSensitivity?: unknown }
    : {};
  const old = settings.stickSensitivity;
  const stickSensitivity = old === 'low' || old === 'high' || old === 'normal'
    ? old
    : typeof old === 'number'
      ? old < 34 ? 'low' : old > 66 ? 'high' : 'normal'
      : DEFAULT_CONTROLLER_SETTINGS.stickSensitivity;
  return {
    rumbleEnabled: typeof settings.rumbleEnabled === 'boolean' ? settings.rumbleEnabled : true,
    abSmashEnabled: typeof settings.abSmashEnabled === 'boolean' ? settings.abSmashEnabled : false,
    stickJumpEnabled: typeof settings.stickJumpEnabled === 'boolean' ? settings.stickJumpEnabled : true,
    stickSensitivity,
  };
}

const FLICK_FRAMES: Record<SmashFlickKind, Record<PlayerControllerSettings['stickSensitivity'], number>> = {
  'forward-smash': { low: 5, normal: 6, high: 7 },
  'vertical-smash': { low: 3, normal: 4, high: 5 },
  'side-special': { low: 7, normal: 8, high: 9 },
};

export function getSmashFlickWindowFrames(settings: PlayerControllerSettings, kind: SmashFlickKind): number {
  return FLICK_FRAMES[kind][settings.stickSensitivity];
}

export function shouldTriggerStickJump(verticalAxis: number, settings: PlayerControllerSettings): boolean {
  return settings.stickJumpEnabled && Number.isFinite(verticalAxis) && verticalAxis <= -STICK_JUMP_THRESHOLD;
}

export const CONTROLLER_DEFAULT_ACTIONS: Record<Exclude<ControllerType, 'keyboard'>, ButtonActionMap> = {
  pro: { A: 'attack', B: 'special', X: 'jump', Y: 'jump', L: 'special', R: 'grab', ZL: 'special', ZR: 'shield', Plus: 'none', Minus: 'none', L3: 'none', R3: 'none', DUp: 'taunt-up', DLeft: 'taunt-side', DRight: 'taunt-side', DDown: 'taunt-down' },
  gamecube: { A: 'attack', B: 'special', X: 'jump', Y: 'jump', L: 'shield', R: 'grab', Z: 'shield', Plus: 'none', Minus: 'none', L3: 'none', R3: 'none', DUp: 'taunt-up', DLeft: 'taunt-side', DRight: 'taunt-side', DDown: 'taunt-down' },
  'joycon-sideways': { A: 'attack', B: 'special', X: 'jump', Y: 'jump', L: 'shield', R: 'grab', SL: 'shield', SR: 'grab', Plus: 'none', Minus: 'none', L3: 'none', DUp: 'taunt-up', DLeft: 'taunt-side', DRight: 'taunt-side', DDown: 'taunt-down' },
};

export function getDefaultButtonActions(controller: ControllerType): ButtonActionMap {
  if (controller === 'keyboard') return {
    KeyJ: 'jump', Space: 'jump', KeyK: 'attack', KeyL: 'special',
    KeyU: 'grab', KeyI: 'shield', KeyW: 'taunt-up', KeyA: 'taunt-side',
    KeyD: 'taunt-side', KeyS: 'taunt-down', Enter: 'none', KeyO: 'smash',
  };
  return { ...CONTROLLER_DEFAULT_ACTIONS[controller] };
}
