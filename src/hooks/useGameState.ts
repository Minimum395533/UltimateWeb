import { useState, useEffect } from 'react';
import type { 
  AppState, 
  PlayerProfile,
  GameSettings
} from '../types';
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
    isReady: false,
  },
  {
    id: 'player2',
    name: 'Player 2',
    characterId: 'captain_falcon',
    colorIndex: 1,
    keybinds: DEFAULT_KEYBINDS_KEYBOARD_P2,
    isReady: false,
  },
];

const initialGameSettings: GameSettings = {
  stockCount: 3,
  timeLimit: 300,
  damageRatio: 1.0,
};

const initialState: AppState = {
  currentScreen: 'start',
  players: initialPlayers,
  selectedPlayerIndex: null,
  gameSettings: initialGameSettings,
};

export function useGameState() {
  const [state, setState] = useState<AppState>(initialState);

  // Load state from localStorage on initial load
  useEffect(() => {
    const savedState = localStorage.getItem('ultimateWebState');
    if (savedState) {
      try {
        setState(JSON.parse(savedState));
      } catch (e) {
        console.error('Failed to load saved state:', e);
      }
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('ultimateWebState', JSON.stringify(state));
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

  const updatePlayerKeybinds = (playerIndex: number, keybinds: any) => {
    updatePlayer(playerIndex, { keybinds });
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
