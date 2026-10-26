import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_KEYBINDS_KEYBOARD_P1 } from '../../src/types/index.ts';
import { getDefaultButtonActions } from '../../src/physics/controllerSettings.ts';
import { readTrainingControlInput } from '../../src/physics/trainingInput.ts';
import { classifyNormalAttack } from '../../src/physics/normalAttacks.ts';
import { resolveAnimationClip } from '../../src/data/falcon/trainingClips.ts';

test('second keyboard player can use the numpad for their own action map', () => {
  const buttons = { keyboard: getDefaultButtonActions('keyboard') };
  const pressed = new Set(['Numpad2', 'Numpad3']);
  const input = readTrainingControlInput(
    DEFAULT_KEYBINDS_KEYBOARD_P1, pressed, [], undefined, pressed,
    buttons, 'keyboard', undefined,
    { KeyK: 'Numpad2', KeyL: 'Numpad3' },
  );
  assert.equal(input.actions.attack, true);
  assert.equal(input.actions.special, true);
});

test('a player can read their assigned gamepad instead of always reading pad zero', () => {
  const makePad = (pressed) => ({
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, (_, index) => ({ pressed: index === 1 && pressed, value: index === 1 && pressed ? 1 : 0 })),
  });
  const input = readTrainingControlInput(
    DEFAULT_KEYBINDS_KEYBOARD_P1, new Set(), [makePad(false), makePad(true)], undefined,
    new Set(), undefined, 'pro', 1,
  );
  assert.equal(input.actions.attack, true);
});

test('a match attack input resolves to a playable ground or aerial clip', () => {
  const buttons = { keyboard: getDefaultButtonActions('keyboard') };
  const pressed = new Set(['KeyK']);
  const input = readTrainingControlInput(
    DEFAULT_KEYBINDS_KEYBOARD_P1, pressed, [], undefined, pressed, buttons, 'keyboard',
  );
  assert.equal(input.actions.attack, true);
  for (const airborne of [false, true]) {
    const attack = classifyNormalAttack({
      attackPressed: input.actions.attack,
      tiltPressed: false,
      smashPressed: false,
      horizontal: 0,
      vertical: 0,
      rightX: 0,
      rightY: 0,
      airborne,
      dashAttack: false,
      stickMode: 'smash',
      flick: false,
    });
    assert.equal(attack, airborne ? 'nair' : 'jab-1');
    const clip = resolveAnimationClip(attack);
    assert.ok(clip);
    assert.ok(clip.frames.length > 0);
    assert.ok(clip.frames.some((frame) => frame.hitboxes.length > 0));
  }
});
