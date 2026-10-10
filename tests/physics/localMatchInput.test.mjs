import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_KEYBINDS_KEYBOARD_P1 } from '../../src/types/index.ts';
import { getDefaultButtonActions } from '../../src/physics/controllerSettings.ts';
import { readTrainingControlInput } from '../../src/physics/trainingInput.ts';

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
