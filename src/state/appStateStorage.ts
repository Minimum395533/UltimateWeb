import { normalizeControllerSettings } from '../physics/controllerSettings';
import type { AppState, PlayerKeybinds, PlayerProfile } from '../types';

export const APP_STATE_STORAGE_KEY = 'ultimateWebState';

export interface AppStateStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergePlayer(
  savedValue: unknown,
  fallback: PlayerProfile,
): PlayerProfile {
  if (!isRecord(savedValue)) return fallback;

  return {
    ...fallback,
    ...savedValue,
    keybinds: isRecord(savedValue.keybinds)
      ? savedValue.keybinds as PlayerKeybinds
      : fallback.keybinds,
    controllerSettings: normalizeControllerSettings(savedValue.controllerSettings),
  };
}

export function loadAppState(storage: AppStateStorage, fallback: AppState): AppState {
  const serialized = storage.getItem(APP_STATE_STORAGE_KEY);
  if (!serialized) return fallback;

  try {
    const savedValue: unknown = JSON.parse(serialized);
    if (!isRecord(savedValue)) return fallback;

    const savedPlayers = Array.isArray(savedValue.players) ? savedValue.players : [];
    const players = (savedPlayers.length > 0 ? savedPlayers : fallback.players).map(
      (player, index) => mergePlayer(
        player,
        fallback.players[index] ?? fallback.players[0],
      ),
    );
    const savedGameSettings = isRecord(savedValue.gameSettings)
      ? savedValue.gameSettings
      : {};

    return {
      ...fallback,
      ...savedValue,
      players,
      gameSettings: {
        ...fallback.gameSettings,
        ...savedGameSettings,
      },
    } as AppState;
  } catch (error) {
    console.error('Failed to load saved game state:', error);
    return fallback;
  }
}

export function saveAppState(storage: AppStateStorage, state: AppState): void {
  storage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(state));
}
