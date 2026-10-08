// Core types for UltimateWeb

// ============================================
// Player & Character Types
// ============================================

export interface PlayerProfile {
  id: string;
  name: string;
  characterId: string;
  colorIndex: number;
  keybinds: PlayerKeybinds;
  isReady: boolean;
}

export interface Character {
  id: string;
  name: string;
  displayName: string;
  colorOptions: CharacterColor[];
  silhouettePath?: string;
}

export interface CharacterColor {
  index: number;
  name: string;
  primaryColor: string;
  secondaryColor: string;
}

// For name display above head (future gameplay)
export interface NameDisplay {
  text: string;
  position: Vector2;
  arrowDirection: 'up' | 'down' | 'left' | 'right' | 'none';
  color: string;
}

// ============================================
// Input & Keybinds Types
// ============================================

export type InputDevice = 'keyboard' | 'gamepad';

export type SmashInput = 
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'jump'
  | 'attack'
  | 'special'
  | 'grab'
  | 'shield'
  | 'dodge'
  | 'taunt'
  | 'start';

export interface InputBinding {
  device: InputDevice;
  // For keyboard
  keyCode?: string;
  // For gamepad
  buttonIndex?: number;
  axisDirection?: 'positive' | 'negative';
  axisIndex?: number;
}

export interface PlayerKeybinds {
  [input: string]: InputBinding;
}

// Default keybinds for keyboard (Player 1)
export const DEFAULT_KEYBINDS_KEYBOARD_P1: PlayerKeybinds = {
  up: { device: 'keyboard', keyCode: 'KeyW' },
  down: { device: 'keyboard', keyCode: 'KeyS' },
  left: { device: 'keyboard', keyCode: 'KeyA' },
  right: { device: 'keyboard', keyCode: 'KeyD' },
  jump: { device: 'keyboard', keyCode: 'KeyJ' },
  attack: { device: 'keyboard', keyCode: 'KeyK' },
  special: { device: 'keyboard', keyCode: 'KeyL' },
  grab: { device: 'keyboard', keyCode: 'KeyU' },
  shield: { device: 'keyboard', keyCode: 'KeyI' },
  dodge: { device: 'keyboard', keyCode: 'KeyO' },
  taunt: { device: 'keyboard', keyCode: 'KeyP' },
  start: { device: 'keyboard', keyCode: 'Enter' },
};

// Default keybinds for keyboard (Player 2)
export const DEFAULT_KEYBINDS_KEYBOARD_P2: PlayerKeybinds = {
  up: { device: 'keyboard', keyCode: 'ArrowUp' },
  down: { device: 'keyboard', keyCode: 'ArrowDown' },
  left: { device: 'keyboard', keyCode: 'ArrowLeft' },
  right: { device: 'keyboard', keyCode: 'ArrowRight' },
  jump: { device: 'keyboard', keyCode: 'Numpad1' },
  attack: { device: 'keyboard', keyCode: 'Numpad2' },
  special: { device: 'keyboard', keyCode: 'Numpad3' },
  grab: { device: 'keyboard', keyCode: 'Numpad4' },
  shield: { device: 'keyboard', keyCode: 'Numpad5' },
  dodge: { device: 'keyboard', keyCode: 'Numpad6' },
  taunt: { device: 'keyboard', keyCode: 'Numpad7' },
  start: { device: 'keyboard', keyCode: 'NumpadEnter' },
};

// Default gamepad bindings (standard layout)
export const DEFAULT_KEYBINDS_GAMEPAD: PlayerKeybinds = {
  up: { device: 'gamepad', axisIndex: 1, axisDirection: 'negative' },
  down: { device: 'gamepad', axisIndex: 1, axisDirection: 'positive' },
  left: { device: 'gamepad', axisIndex: 0, axisDirection: 'negative' },
  right: { device: 'gamepad', axisIndex: 0, axisDirection: 'positive' },
  jump: { device: 'gamepad', buttonIndex: 0 },
  attack: { device: 'gamepad', buttonIndex: 1 },
  special: { device: 'gamepad', buttonIndex: 2 },
  grab: { device: 'gamepad', buttonIndex: 3 },
  shield: { device: 'gamepad', buttonIndex: 4 },
  dodge: { device: 'gamepad', buttonIndex: 5 },
  taunt: { device: 'gamepad', buttonIndex: 6 },
  start: { device: 'gamepad', buttonIndex: 9 },
};

// ============================================
// Game State Types
// ============================================

export type GameMode = 'local' | 'training' | 'online';

export interface GameSettings {
  stageId?: string;
  stockCount?: number;
  timeLimit?: number;
  damageRatio?: number;
}

export interface AppState {
  currentScreen: 'start' | 'local' | 'training' | 'keybinds' | 'settings' | 'online';
  players: PlayerProfile[];
  selectedPlayerIndex: number | null; // For keybinds/color editing
  gameSettings: GameSettings;
}

// ============================================
// For future gameplay (data structure only)
// ============================================

export interface Vector2 {
  x: number;
  y: number;
}

export interface Hitbox {
  position: Vector2;
  radius: number;
  damage: number;
  angle: number;
  kbg: number;
  bkb: number;
  fkb: number;
  element: 'normal' | 'fire' | 'electric' | 'slime' | 'freeze' | 'flinch';
  hitlagMultiplier: number;
  shieldDamage: number;
  isActive: boolean;
  frameStart: number;
  frameEnd: number;
}

export interface Hurtbox {
  position: Vector2;
  radius: number;
  isVulnerable: boolean;
}

export interface PlayerGameState {
  position: Vector2;
  velocity: Vector2;
  percent: number;
  stocks: number;
  character: Character;
  colorIndex: number;
  name: string;
  // For name display above head
  namePosition: Vector2;
  arrowDirection: 'up' | 'down' | 'left' | 'right' | 'none';
  hitboxes: Hitbox[];
  hurtboxes: Hurtbox[];
}

// ============================================
// UI Types
// ============================================

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
}

export interface ColorPreset {
  index: number;
  name: string;
  primary: string;
  secondary: string;
}

// Captain Falcon's color presets
export const CAPTAIN_FALCON_COLORS: CharacterColor[] = [
  { index: 0, name: 'Default', primaryColor: '#0066CC', secondaryColor: '#FFFFFF' },
  { index: 1, name: 'Red', primaryColor: '#CC0000', secondaryColor: '#FFFFFF' },
  { index: 2, name: 'Blue', primaryColor: '#003399', secondaryColor: '#FFFFFF' },
  { index: 3, name: 'Black', primaryColor: '#000000', secondaryColor: '#FFFFFF' },
  { index: 4, name: 'Green', primaryColor: '#009900', secondaryColor: '#FFFFFF' },
  { index: 5, name: 'White', primaryColor: '#FFFFFF', secondaryColor: '#0066CC' },
  { index: 6, name: 'Yellow', primaryColor: '#FFCC00', secondaryColor: '#000000' },
  { index: 7, name: 'Purple', primaryColor: '#9900CC', secondaryColor: '#FFFFFF' },
  { index: 8, name: 'Orange', primaryColor: '#FF6600', secondaryColor: '#000000' },
];

// ============================================
// Constants
// ============================================

export const SMASH_INPUTS: SmashInput[] = [
  'up', 'down', 'left', 'right',
  'jump', 'attack', 'special', 'grab',
  'shield', 'dodge', 'taunt', 'start'
];

export const CHARACTERS: Character[] = [
  {
    id: 'captain_falcon',
    name: 'captain_falcon',
    displayName: 'Captain Falcon',
    colorOptions: CAPTAIN_FALCON_COLORS,
  },
];
