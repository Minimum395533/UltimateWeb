import { useState, useEffect } from 'react';
import type { InputBinding, SmashInput, PlayerKeybinds } from '../types';

// Gamepad button names for display
const GAMEPAD_BUTTON_NAMES: Record<number, string> = {
  0: 'A',
  1: 'B',
  2: 'X',
  3: 'Y',
  4: 'LB',
  5: 'RB',
  6: 'LT',
  7: 'RT',
  8: 'Back',
  9: 'Start',
  10: 'LS',
  11: 'RS',
  12: 'Up',
  13: 'Down',
  14: 'Left',
  15: 'Right',
  16: 'Home',
};

// Gamepad axis names
const GAMEPAD_AXIS_NAMES: Record<number, string> = {
  0: 'L Stick Horizontal',
  1: 'L Stick Vertical',
  2: 'R Stick Horizontal',
  3: 'R Stick Vertical',
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

  // Scan for connected gamepads periodically
  useEffect(() => {
    const checkGamepads = () => {
      const connectedGamepads = [];
      for (let i = 0; i < navigator.getGamepads().length; i++) {
        const gamepad = navigator.getGamepads()[i];
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
  }, [listeningForInput, gamepads]);

  const startListeningForInput = (input: SmashInput, playerIndex: number) => {
    setListeningForInput(input);
    setListeningPlayerIndex(playerIndex);
  };

  const stopListeningForInput = () => {
    setListeningForInput(null);
    setListeningPlayerIndex(null);
  };

  const getInputDisplayName = (binding: InputBinding): string => {
    if (binding.device === 'keyboard') {
      return KEY_CODE_NAMES[binding.keyCode || ''] || binding.keyCode || 'Unknown';
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

  const createKeybindsWithDefault = (existingKeybinds: PlayerKeybinds): PlayerKeybinds => {
    const defaultKeybinds: PlayerKeybinds = {
      up: { device: 'keyboard', keyCode: '' },
      down: { device: 'keyboard', keyCode: '' },
      left: { device: 'keyboard', keyCode: '' },
      right: { device: 'keyboard', keyCode: '' },
      jump: { device: 'keyboard', keyCode: '' },
      attack: { device: 'keyboard', keyCode: '' },
      special: { device: 'keyboard', keyCode: '' },
      grab: { device: 'keyboard', keyCode: '' },
      shield: { device: 'keyboard', keyCode: '' },
      dodge: { device: 'keyboard', keyCode: '' },
      taunt: { device: 'keyboard', keyCode: '' },
      start: { device: 'keyboard', keyCode: '' },
    };
    return { ...defaultKeybinds, ...existingKeybinds };
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
