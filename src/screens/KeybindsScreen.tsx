import React, { useState, useEffect } from 'react';
import { useGameState } from '../hooks/useGameState';
import { useInput } from '../hooks/useInput';
import { SMASH_INPUTS } from '../types';
import type { PlayerKeybinds, InputBinding } from '../types';
import '../styles/KeybindsScreen.css';

const KeybindsScreen: React.FC = () => {
  const {
    state,
    selectPlayerForEdit,
    updatePlayerKeybinds,
    navigateTo,
  } = useGameState();
  
  const {
    gamepads,
    startListeningForInput,
    stopListeningForInput,
    getInputDisplayName,
    createKeybindsWithDefault,
  } = useInput();

  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState<number>(0);
  const [editingInput, setEditingInput] = useState<string | null>(null);

  // Sync with game state
  useEffect(() => {
    if (state.selectedPlayerIndex !== null) {
      setSelectedPlayerIndex(state.selectedPlayerIndex);
    }
  }, [state.selectedPlayerIndex]);

  // Handle input detection
  useEffect(() => {
    const handleInputDetected = (e: any) => {
      const detectedInput = e.detail;
      
      if (editingInput) {
        const newBinding: InputBinding = {
          device: detectedInput.type,
          keyCode: detectedInput.code,
          buttonIndex: detectedInput.buttonIndex,
          axisIndex: detectedInput.axisIndex,
          axisDirection: detectedInput.axisDirection,
        };

        const player = state.players[selectedPlayerIndex];
        const newKeybinds = { ...player.keybinds, [editingInput]: newBinding };
        updatePlayerKeybinds(selectedPlayerIndex, newKeybinds);
        
        setEditingInput(null);
        stopListeningForInput();
      }
    };

    window.addEventListener('inputDetected', handleInputDetected);
    return () => {
      window.removeEventListener('inputDetected', handleInputDetected);
    };
  }, [editingInput, selectedPlayerIndex, state.players, updatePlayerKeybinds, stopListeningForInput]);

  const handleBack = () => {
    navigateTo('start');
  };

  const handleNameChange = (_e: React.ChangeEvent<HTMLInputElement>) => {
    // Will implement name change later
  };

  const handlePlayerSelect = (playerIndex: number) => {
    setSelectedPlayerIndex(playerIndex);
    selectPlayerForEdit(playerIndex);
  };

  const handleBindInput = (input: string) => {
    setEditingInput(input);
    startListeningForInput(input as any, selectedPlayerIndex);
  };

  const handleCancelBind = () => {
    setEditingInput(null);
    stopListeningForInput();
  };

  const handleResetToDefault = () => {
    const newKeybinds: PlayerKeybinds = {
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
    
    updatePlayerKeybinds(selectedPlayerIndex, newKeybinds);
  };

  const selectedPlayer = state.players[selectedPlayerIndex];
  const filledKeybinds = createKeybindsWithDefault(selectedPlayer?.keybinds || {});

  return (
    <div className="keybinds-screen">
      <div className="background-overlay" />
      
      {/* Header */}
      <div className="header">
        <button className="back-button" onClick={handleBack}>
          ← BACK
        </button>
        <h1>NAMES & KEYBINDS</h1>
        <div className="header-spacer" />
      </div>

      <div className="content">
        {/* Player Selection Tabs */}
        <div className="player-tabs">
          {state.players.map((player, index) => (
            <button
              key={player.id}
              className={`player-tab ${selectedPlayerIndex === index ? 'active' : ''}`}
              onClick={() => handlePlayerSelect(index)}
            >
              {player.name}
            </button>
          ))}
        </div>

        {/* Name Edit Section */}
        <div className="section">
          <h2>Player Name</h2>
          <div className="name-edit">
            <input
              type="text"
              value={selectedPlayer?.name || ''}
              onChange={handleNameChange}
              className="name-input"
              placeholder="Enter your name"
            />
          </div>
        </div>

        {/* Device Selection */}
        <div className="section">
          <h2>Input Device</h2>
          <div className="device-selector">
            <label className="device-option">
              <input
                type="radio"
                name="device"
                value="keyboard"
                checked={true} // For now, always keyboard
                onChange={() => {}}
              />
              <span>Keyboard</span>
            </label>
            <label className="device-option">
              <input
                type="radio"
                name="device"
                value="gamepad"
                checked={false}
                onChange={() => {}}
              />
              <span>Gamepad {gamepads.length > 0 && `(${gamepads.length} connected)`}</span>
            </label>
          </div>
        </div>

        {/* Keybinds Table */}
        <div className="section">
          <h2>Keybinds</h2>
          <div className="keybinds-instructions">
            <p>Click a binding and press the key/button you want to use.</p>
            {editingInput && (
              <div className="listening-indicator">
                <span className="pulse" />
                Waiting for input: {editingInput}
                <button className="cancel-bind" onClick={handleCancelBind}>Cancel</button>
              </div>
            )}
          </div>
          
          <div className="keybinds-grid">
            {SMASH_INPUTS.map((input) => {
              const binding = filledKeybinds[input];
              const displayName = binding ? getInputDisplayName(binding) : 'Not Bound';
              
              return (
                <div key={input} className="keybind-row">
                  <div className="input-label">{input.toUpperCase()}</div>
                  <button
                    className={`binding-button ${editingInput === input ? 'editing' : ''}`}
                    onClick={() => handleBindInput(input)}
                  >
                    {editingInput === input ? '...' : displayName}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="reset-section">
            <button className="reset-button" onClick={handleResetToDefault}>
              Reset to Default
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeybindsScreen;
