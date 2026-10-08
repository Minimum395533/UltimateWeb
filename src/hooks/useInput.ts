import { useState, useEffect } from 'react';
import {
  DEFAULT_KEYBINDS_GAMEPAD,
  DEFAULT_KEYBINDS_KEYBOARD_P1,
  DEFAULT_KEYBINDS_KEYBOARD_P2,
  SMASH_INPUTS,
} from '../types';
import type { InputBinding, InputDevice, SmashInput, PlayerKeybinds } from '../types';

// Gamepad button names for display
const GAMEPAD_BUTTON_NAMES: Record<number, string> = {
  0: 'B',
  1: 'A',
  2: 'Y',
  3: 'X',
  4: 'L',
  5: 'R',
  6: 'ZL',
  7: 'ZR',
  8: '−',
  9: '+',
  10: 'L stick',
  11: 'R stick',
  12: 'D-pad up',
  13: 'D-pad down',
  14: 'D-pad left',
  15: 'D-pad right',
  16: 'Home',
};

// Gamepad axis names
const GAMEPAD_AXIS_NAMES: Record<number, string> = {
  0: 'Left stick horizontal',
  1: 'Left stick vertical',
  2: 'Right stick horizontal',
  3: 'Right stick vertical',
};

// Key code to display name mapping
const KEY_CODE_NAMES: Record<string, string> = {
  'KeyW': 'W',
  'KeyA': 'A',
  'KeyS': 'S',
  'KeyD': 'D',
  'KeyJ': 'J',
  'KeyK': 'K',
  'KeyL': 'L',
  'KeyU': 'U',
  'KeyI': 'I',
  'KeyO': 'O',
  'KeyP': 'P',
  'ArrowUp': '↑',
  'ArrowDown': '↓',
  'ArrowLeft': '←',
  'ArrowRight': '→',
  'Numpad1': 'Num 1',
  'Numpad2': 'Num 2',
  'Numpad3': 'Num 3',
  'Numpad4': 'Num 4',
  'Numpad5': 'Num 5',
  'Numpad6': 'Num 6',
  'Numpad7': 'Num 7',
  'Numpad8': 'Num 8',
  'Numpad9': 'Num 9',
  'Numpad0': 'Num 0',
  'NumpadEnter': 'Num Enter',
  'NumpadAdd': 'Num +',
  'NumpadSubtract': 'Num −',
  'NumpadMultiply': 'Num ×',
  'NumpadDecimal': 'Num .',
  'Enter': 'Enter',
  'Space': 'Space',
  'ShiftLeft': 'Shift',
  'ShiftRight': 'Shift',
  'ControlLeft': 'Ctrl',
  'ControlRight': 'Ctrl',
  'AltLeft': 'Alt',
  'AltRight': 'Alt',
  'Escape': 'Esc',
};

export interface DetectedInput {
  type: 'keyboard' | 'gamepad';
  code?: string;
  buttonIndex?: number;
  axisIndex?: number;
  axisDirection?: 'positive' | 'negative';
  value?: number;
}

export function useInput() {
  const [gamepads, setGamepads] = useState<Gamepad[]>([]);
  const [listeningForInput, setListeningForInput] = useState<SmashInput | null>(null);
  const [listeningPlayerIndex, setListeningPlayerIndex] = useState<number | null>(null);
  const [listeningDevice, setListeningDevice] = useState<InputDevice | null>(null);

  // Scan for connected gamepads periodically
  useEffect(() => {
    const checkGamepads = () => {
      const connectedGamepads = [];
      const availableGamepads = navigator.getGamepads?.() ?? [];
      for (let i = 0; i < availableGamepads.length; i++) {
        const gamepad = availableGamepads[i];
        if (gamepad) {
          connectedGamepads.push(gamepad);
        }
      }
      setGamepads(connectedGamepads);
    };

    checkGamepads();
    const interval = setInterval(checkGamepads, 1000);
    
    window.addEventListener('gamepadconnected', checkGamepads);
    window.addEventListener('gamepaddisconnected', checkGamepads);

    return () => {
      clearInterval(interval);
      window.removeEventListener('gamepadconnected', checkGamepads);
      window.removeEventListener('gamepaddisconnected', checkGamepads);
    };
  }, []);

  // Listen for keyboard/gamepad input when in binding mode
  useEffect(() => {
    if (!listeningForInput) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (listeningDevice && listeningDevice !== 'keyboard') return;
      e.preventDefault();
      e.stopPropagation();
      
      // Skip modifier keys
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

      const detectedInput: DetectedInput = {
        type: 'keyboard',
        code: e.code,
      };

      // Notify parent component
      window.dispatchEvent(new CustomEvent('inputDetected', { detail: detectedInput }));
      setListeningForInput(null);
      setListeningPlayerIndex(null);
    };

    const handleGamepadInput = () => {
      if (listeningDevice && listeningDevice !== 'gamepad') return;

      for (const gamepad of gamepads) {
        // Check buttons
        for (let i = 0; i < gamepad.buttons.length; i++) {
          if (gamepad.buttons[i].pressed) {
            const detectedInput: DetectedInput = {
              type: 'gamepad',
              buttonIndex: i,
            };
            window.dispatchEvent(new CustomEvent('inputDetected', { detail: detectedInput }));
            setListeningForInput(null);
            setListeningPlayerIndex(null);
            return;
          }
        }
        
        // Check axes (with threshold)
        const AXIS_THRESHOLD = 0.5;
        for (let i = 0; i < gamepad.axes.length; i++) {
          const value = gamepad.axes[i];
          if (Math.abs(value) > AXIS_THRESHOLD) {
            const detectedInput: DetectedInput = {
              type: 'gamepad',
              axisIndex: i,
              axisDirection: value > 0 ? 'positive' : 'negative',
              value,
            };
            window.dispatchEvent(new CustomEvent('inputDetected', { detail: detectedInput }));
            setListeningForInput(null);
            setListeningPlayerIndex(null);
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const gamepadCheckInterval = setInterval(handleGamepadInput, 16);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(gamepadCheckInterval);
    };
  }, [listeningForInput, listeningDevice, gamepads]);

  const startListeningForInput = (input: SmashInput, playerIndex: number, device?: InputDevice) => {
    setListeningForInput(input);
    setListeningPlayerIndex(playerIndex);
    setListeningDevice(device ?? null);
  };

  const stopListeningForInput = () => {
    setListeningForInput(null);
    setListeningPlayerIndex(null);
    setListeningDevice(null);
  };

  const getInputDisplayName = (binding: InputBinding): string => {
    if (binding.device === 'keyboard') {
      const keyCode = binding.keyCode || '';
      const fallback = keyCode.startsWith('Key')
        ? keyCode.slice(3)
        : keyCode.startsWith('Digit')
          ? keyCode.slice(5)
          : keyCode;
      return KEY_CODE_NAMES[keyCode] || fallback || 'Unknown';
    } else if (binding.device === 'gamepad') {
      if (binding.buttonIndex !== undefined) {
        return GAMEPAD_BUTTON_NAMES[binding.buttonIndex] || `Button ${binding.buttonIndex}`;
      } else if (binding.axisIndex !== undefined) {
        const axisName = GAMEPAD_AXIS_NAMES[binding.axisIndex] || `Axis ${binding.axisIndex}`;
        const direction = binding.axisDirection === 'positive' ? '+' : '-';
        return `${axisName} ${direction}`;
      }
    }
    return 'Not Bound';
  };

  const createKeybindsWithDefault = (
    existingKeybinds: PlayerKeybinds,
    playerIndex = 0,
  ): PlayerKeybinds => {
    const defaults: Record<InputDevice, PlayerKeybinds> = {
      keyboard: playerIndex === 0 ? DEFAULT_KEYBINDS_KEYBOARD_P1 : DEFAULT_KEYBINDS_KEYBOARD_P2,
      gamepad: DEFAULT_KEYBINDS_GAMEPAD,
    };
    const bindings: PlayerKeybinds = {};

    for (const input of SMASH_INPUTS) {
      for (const device of ['keyboard', 'gamepad'] as const) {
        const key = `${device}:${input}`;
        const storedBinding = existingKeybinds[key];
        const legacyBinding = existingKeybinds[input]?.device === device
          ? existingKeybinds[input]
          : undefined;
        const oldTauntBinding = input === 'tauntUp' && existingKeybinds.taunt?.device === device
          ? existingKeybinds.taunt
          : undefined;

        bindings[key] = storedBinding ?? legacyBinding ?? oldTauntBinding ?? defaults[device][input] ?? {
          device,
          keyCode: '',
        };
      }
    }

    return bindings;
  };

  return {
    gamepads,
    listeningForInput,
    listeningPlayerIndex,
    startListeningForInput,
    stopListeningForInput,
    getInputDisplayName,
    createKeybindsWithDefault,
  };
}
