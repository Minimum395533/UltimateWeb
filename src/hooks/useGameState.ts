import { useState, useEffect } from 'react';
import type { 
  AppState, 
  PlayerProfile,
  GameSettings,
  PlayerKeybinds,
  PlayerControllerSettings,
} from '../types';
import { DEFAULT_CONTROLLER_SETTINGS, getDefaultButtonActions, normalizeControllerSettings } from '../physics/controllerSettings';
import { loadAppState, saveAppState } from '../state/appStateStorage';
import { 
  DEFAULT_KEYBINDS_KEYBOARD_P1,
  DEFAULT_KEYBINDS_KEYBOARD_P2,
} from '../types';

const initialPlayers: PlayerProfile[] = [
  {
    id: 'player1',
    name: 'Player 1',
    characterId: 'captain_falcon',
    colorIndex: 0,
    keybinds: DEFAULT_KEYBINDS_KEYBOARD_P1,
    controllerType: 'pro',
    buttonSettings: {
      pro: getDefaultButtonActions('pro'),
      gamecube: getDefaultButtonActions('gamecube'),
      'joycon-sideways': getDefaultButtonActions('joycon-sideways'),
      keyboard: getDefaultButtonActions('keyboard'),
    },
    controllerSettings: { ...DEFAULT_CONTROLLER_SETTINGS },
    isReady: false,
  },
  {
    id: 'player2',
    name: 'Player 2',
    characterId: 'captain_falcon',
    colorIndex: 1,
    keybinds: DEFAULT_KEYBINDS_KEYBOARD_P2,
    controllerType: 'pro',
    buttonSettings: {
      pro: getDefaultButtonActions('pro'),
      gamecube: getDefaultButtonActions('gamecube'),
      'joycon-sideways': getDefaultButtonActions('joycon-sideways'),
      keyboard: getDefaultButtonActions('keyboard'),
    },
    controllerSettings: { ...DEFAULT_CONTROLLER_SETTINGS },
    isReady: false,
  },
];

const initialGameSettings: GameSettings = {
  stockCount: 3,
  timeLimit: 420,
  damageRatio: 1.0,
};

const initialState: AppState = {
  currentScreen: 'start',
  players: initialPlayers,
  selectedPlayerIndex: null,
  gameSettings: initialGameSettings,
};

export function useGameState() {
  const [state, setState] = useState<AppState>(
    () => loadAppState(localStorage, initialState),
  );

  // Save state to localStorage whenever it changes
  useEffect(() => {
    saveAppState(localStorage, state);
  }, [state]);

  const navigateTo = (screen: AppState['currentScreen']) => {
    setState(prev => ({ ...prev, currentScreen: screen, selectedPlayerIndex: null }));
  };

  const updatePlayer = (playerIndex: number, updates: Partial<PlayerProfile>) => {
    setState(prev => {
      const newPlayers = [...prev.players];
      newPlayers[playerIndex] = { ...newPlayers[playerIndex], ...updates };
      return { ...prev, players: newPlayers };
    });
  };

  const updatePlayerName = (playerIndex: number, name: string) => {
    updatePlayer(playerIndex, { name });
  };

  const updatePlayerCharacter = (playerIndex: number, characterId: string) => {
    updatePlayer(playerIndex, { characterId, isReady: false });
  };

  const updatePlayerColor = (playerIndex: number, colorIndex: number) => {
    updatePlayer(playerIndex, { colorIndex });
  };

  const updatePlayerKeybinds = (playerIndex: number, keybinds: PlayerKeybinds) => {
    updatePlayer(playerIndex, { keybinds });
  };

  const updatePlayerControllerSettings = (
    playerIndex: number,
    controllerSettings: PlayerControllerSettings,
  ) => {
    updatePlayer(playerIndex, {
      controllerSettings: normalizeControllerSettings(controllerSettings),
    });
  };

  const togglePlayerReady = (playerIndex: number) => {
    setState(prev => {
      const newPlayers = [...prev.players];
      newPlayers[playerIndex] = { 
        ...newPlayers[playerIndex], 
        isReady: !newPlayers[playerIndex].isReady 
      };
      return { ...prev, players: newPlayers };
    });
  };

  const setPlayerReady = (playerIndex: number, isReady: boolean) => {
    updatePlayer(playerIndex, { isReady });
  };

  const selectPlayerForEdit = (playerIndex: number | null) => {
    setState(prev => ({ ...prev, selectedPlayerIndex: playerIndex }));
  };

  const updateGameSettings = (settings: Partial<GameSettings>) => {
    setState(prev => ({
      ...prev,
      gameSettings: { ...prev.gameSettings, ...settings }
    }));
  };

  const resetPlayers = () => {
    setState(prev => ({
      ...prev,
      players: initialPlayers.map((p, i) => ({
        ...p,
        name: `Player ${i + 1}`,
        characterId: 'captain_falcon',
        colorIndex: i % captainFalconColors.length,
        isReady: false,
      })),
    }));
  };

  // Check if all players are ready (for starting local game)
  const allPlayersReady = state.players.every(p => p.isReady);

  // Check if both players have selected a character
  const canStartLocalGame = state.players.length >= 2 && 
    state.players.every(p => p.characterId && p.name);

  return {
    state,
    navigateTo,
    updatePlayer,
    updatePlayerName,
    updatePlayerCharacter,
    updatePlayerColor,
    updatePlayerKeybinds,
    updatePlayerControllerSettings,
    togglePlayerReady,
    setPlayerReady,
    selectPlayerForEdit,
    updateGameSettings,
    resetPlayers,
    allPlayersReady,
    canStartLocalGame,
  };
}

// Import for colors (circular dependency workaround)
import { captainFalconColors } from '../data/characters';
