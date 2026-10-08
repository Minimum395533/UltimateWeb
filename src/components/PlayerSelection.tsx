import React from 'react';
import type { PlayerProfile, Character } from '../types';
import '../styles/PlayerSelection.css';

interface PlayerSelectionProps {
  player: PlayerProfile;
  playerIndex: number;
  characters: Character[];
  onNameChange: (name: string) => void;
  onCharacterChange: (characterId: string) => void;
  onColorChange: (colorIndex: number) => void;
  onToggleReady: () => void;
  isReady: boolean;
}

const PlayerSelection: React.FC<PlayerSelectionProps> = ({
  player,
  playerIndex,
  characters,
  onNameChange,
  onCharacterChange,
  onColorChange,
  onToggleReady,
  isReady,
}) => {
  const selectedCharacter = characters.find(c => c.id === player.characterId);
  const selectedColor = selectedCharacter?.colorOptions.find(c => c.index === player.colorIndex);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onNameChange(e.target.value);
  };

  const handleCharacterSelect = (characterId: string) => {
    onCharacterChange(characterId);
  };

  const handleColorSelect = (colorIndex: number) => {
    onColorChange(colorIndex);
  };

  return (
    <div className={`player-selection ${isReady ? 'ready' : ''}`}>
      <div className="player-header">
        <h3>P{playerIndex + 1}</h3>
        <div className="ready-indicator">
          {isReady && <span className="ready-badge">✓ READY</span>}
        </div>
      </div>

      {/* Name Input */}
      <div className="name-section">
        <label>Name:</label>
        <input
          type="text"
          value={player.name}
          onChange={handleNameChange}
          className="name-input"
          placeholder="Enter name"
          maxLength={20}
        />
      </div>

      {/* Character Selection */}
      <div className="character-section">
        <label>Character:</label>
        <div className="character-grid">
          {characters.map((character) => {
            const isSelected = character.id === player.characterId;
            return (
              <button
                key={character.id}
                className={`character-button ${isSelected ? 'selected' : ''}`}
                onClick={() => handleCharacterSelect(character.id)}
                style={{
                  '--primary-color': selectedColor?.primaryColor || '#666',
                  '--secondary-color': selectedColor?.secondaryColor || '#fff',
                } as React.CSSProperties}
              >
                <div className="character-icon">
                  {isSelected && (
                    <div className="selection-ring" />
                  )}
                  <span className="character-initial">
                    {character.displayName.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <span className="character-name">{character.displayName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Selection */}
      {selectedCharacter && (
        <div className="color-section">
          <label>Color:</label>
          <div className="color-grid">
            {selectedCharacter.colorOptions.map((color) => {
              const isSelected = color.index === player.colorIndex;
              return (
                <button
                  key={color.index}
                  className={`color-button ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleColorSelect(color.index)}
                  style={{
                    background: color.primaryColor,
                    borderColor: color.secondaryColor,
                  }}
                >
                  {isSelected && (
                    <div className="color-selection-indicator">✓</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Ready Button */}
      <div className="ready-section">
        <button
          className={`ready-button ${isReady ? 'ready' : ''}`}
          onClick={onToggleReady}
          disabled={!player.characterId}
        >
          {isReady ? 'NOT READY' : 'READY'}
        </button>
      </div>
    </div>
  );
};

export default PlayerSelection;
