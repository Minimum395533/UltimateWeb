import React from 'react';
import { useGameState } from '../hooks/useGameState';
import { characters } from '../data/characters';
import PlayerSelection from '../components/PlayerSelection';
import '../styles/LocalPlayScreen.css';

const LocalPlayScreen: React.FC = () => {
  const {
    state,
    updatePlayerName,
    updatePlayerCharacter,
    updatePlayerColor,
    togglePlayerReady,
    canStartLocalGame,
    allPlayersReady,
    navigateTo,
  } = useGameState();

  const handleStartGame = () => {
    if (canStartLocalGame && allPlayersReady) {
      alert('Game would start now! (Gameplay not yet implemented)');
    }
  };

  const handleBack = () => {
    navigateTo('start');
  };

  // Get character display name
  const getCharacterDisplayName = (characterId: string) => {
    const character = characters.find(c => c.id === characterId);
    return character ? character.displayName : 'Unknown';
  };

  return (
    <div className="local-play-screen">
      <div className="background-overlay" />
      
      {/* Header */}
      <div className="header">
        <button className="back-button" onClick={handleBack}>
          ← BACK
        </button>
        <h1>LOCAL PLAY</h1>
        <div className="header-spacer" />
      </div>

      {/* Player Selection Area */}
      <div className="player-selection-container">
        {state.players.map((player, index) => (
          <PlayerSelection
            key={player.id}
            player={player}
            playerIndex={index}
            characters={characters}
            onNameChange={(name) => updatePlayerName(index, name)}
            onCharacterChange={(characterId) => updatePlayerCharacter(index, characterId)}
            onColorChange={(colorIndex) => updatePlayerColor(index, colorIndex)}
            onToggleReady={() => togglePlayerReady(index)}
            isReady={player.isReady}
          />
        ))}
      </div>

      {/* Start Button */}
      {canStartLocalGame && (
        <div className="start-button-container">
          <button
            className={`start-button ${allPlayersReady ? 'ready' : 'not-ready'}`}
            onClick={handleStartGame}
            disabled={!allPlayersReady}
          >
            {allPlayersReady ? 'START GAME!' : 'SELECT CHARACTERS TO START'}
          </button>
        </div>
      )}

      {/* Status indicators */}
      <div className="status-indicators">
        {state.players.map((player, index) => (
          <div key={player.id} className={`status-indicator ${player.isReady ? 'ready' : 'not-ready'}`}>
            <span>P{index + 1}: {player.name}</span>
            <span> - </span>
            <span>{getCharacterDisplayName(player.characterId)}</span>
            {player.isReady && <span className="ready-check">✓ READY</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LocalPlayScreen;
