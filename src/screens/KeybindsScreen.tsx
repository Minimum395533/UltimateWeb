import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { useInput } from '../hooks/useInput';
import type { DetectedInput } from '../hooks/useInput';
import { SMASH_INPUTS } from '../types';
import type { InputBinding, InputDevice, PlayerKeybinds, SmashInput } from '../types';
import '../styles/KeybindsScreen.css';

interface BindingRow {
  input: SmashInput;
  action: string;
  control: string;
}

const shoulderLeft: BindingRow[] = [
  { input: 'specialZL', action: 'Special', control: 'ZL' },
  { input: 'specialL', action: 'Special', control: 'L' },
];

const shoulderRight: BindingRow[] = [
  { input: 'shield', action: 'Shield', control: 'ZR' },
  { input: 'grab', action: 'Grab', control: 'R' },
];

const faceControls: BindingRow[] = [
  { input: 'jump', action: 'Jump', control: 'X' },
  { input: 'jumpAlt', action: 'Jump', control: 'Y' },
  { input: 'attack', action: 'Attack', control: 'A' },
  { input: 'special', action: 'Special', control: 'B' },
  { input: 'tiltAttack', action: 'Tilt attack', control: 'R stick' },
];

const tauntControls: BindingRow[] = [
  { input: 'tauntUp', action: 'Up taunt', control: '↑' },
  { input: 'tauntLeft', action: 'Side taunt · left', control: '←' },
  { input: 'tauntRight', action: 'Side taunt · right', control: '→' },
  { input: 'tauntDown', action: 'Down taunt', control: '↓' },
];

const movementControls: BindingRow[] = [
  { input: 'up', action: 'Move up', control: '↑' },
  { input: 'left', action: 'Move left', control: '←' },
  { input: 'right', action: 'Move right', control: '→' },
  { input: 'down', action: 'Move down', control: '↓' },
];

const otherControls: BindingRow[] = [
  { input: 'dodge', action: 'Dodge', control: '−' },
  { input: 'start', action: 'Pause / start', control: '+' },
];

const KeybindsScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    state,
    selectPlayerForEdit,
    updatePlayerKeybinds,
    updatePlayerName,
  } = useGameState();
  
  const {
    gamepads,
    startListeningForInput,
    stopListeningForInput,
    getInputDisplayName,
    createKeybindsWithDefault,
  } = useInput();

  const [manualPlayerIndex, setManualPlayerIndex] = useState<number | null>(null);
  const selectedPlayerIndex = manualPlayerIndex ?? state.selectedPlayerIndex ?? 0;
  const [selectedDevice, setSelectedDevice] = useState<InputDevice>('gamepad');
  const [editingInput, setEditingInput] = useState<SmashInput | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testFeedback, setTestFeedback] = useState('');
  const [saveFeedback, setSaveFeedback] = useState('');

  useEffect(() => {
    const handleInputDetected = (event: Event) => {
      const detectedInput = (event as CustomEvent<DetectedInput>).detail;
      if (!editingInput || !detectedInput || detectedInput.type !== selectedDevice) return;

      const player = state.players[selectedPlayerIndex];
      if (!player) return;

      const newBinding: InputBinding = {
        device: detectedInput.type,
        keyCode: detectedInput.code,
        buttonIndex: detectedInput.buttonIndex,
        axisIndex: detectedInput.axisIndex,
        axisDirection: detectedInput.axisDirection,
      };
      const bindingKey = `${selectedDevice}:${editingInput}`;
      const newKeybinds: PlayerKeybinds = {
        ...player.keybinds,
        [bindingKey]: newBinding,
      };

      updatePlayerKeybinds(selectedPlayerIndex, newKeybinds);
      setEditingInput(null);
      setSaveFeedback('');
      stopListeningForInput();
    };

    window.addEventListener('inputDetected', handleInputDetected);
    return () => {
      window.removeEventListener('inputDetected', handleInputDetected);
    };
  }, [editingInput, selectedDevice, selectedPlayerIndex, state.players, updatePlayerKeybinds, stopListeningForInput]);

  useEffect(() => {
    if (!isTesting) return;

    const handleKeyboardTest = (event: KeyboardEvent) => {
      setTestFeedback(`Keyboard · ${event.key === ' ' ? 'Space' : event.key}`);
    };
    const gamepadTimer = window.setInterval(() => {
      const pads = navigator.getGamepads?.() ?? [];
      for (let index = 0; index < pads.length; index += 1) {
        const pad = pads[index];
        if (!pad) continue;
        const pressedButtonIndex = pad.buttons.findIndex((button) => button.pressed);
        if (pressedButtonIndex >= 0) {
          setTestFeedback(`${pad.id || `Controller ${index + 1}`} · ${getInputDisplayName({
            device: 'gamepad',
            buttonIndex: pressedButtonIndex,
          })}`);
          return;
        }
        const movedAxisIndex = pad.axes.findIndex((axis) => Math.abs(axis) > 0.65);
        if (movedAxisIndex >= 0) {
          const axisValue = pad.axes[movedAxisIndex];
          setTestFeedback(`${pad.id || `Controller ${index + 1}`} · ${getInputDisplayName({
            device: 'gamepad',
            axisIndex: movedAxisIndex,
            axisDirection: axisValue > 0 ? 'positive' : 'negative',
          })}`);
          return;
        }
      }
    }, 60);

    window.addEventListener('keydown', handleKeyboardTest);
    return () => {
      window.removeEventListener('keydown', handleKeyboardTest);
      window.clearInterval(gamepadTimer);
    };
  }, [isTesting, getInputDisplayName]);

  const handleBack = () => {
    stopListeningForInput();
    navigate('/');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updatePlayerName(selectedPlayerIndex, e.target.value);
  };

  const handlePlayerSelect = (playerIndex: number) => {
    stopListeningForInput();
    setEditingInput(null);
    setIsTesting(false);
    setManualPlayerIndex(playerIndex);
    selectPlayerForEdit(playerIndex);
  };

  const handleDeviceSelect = (device: InputDevice) => {
    stopListeningForInput();
    setEditingInput(null);
    setIsTesting(false);
    setSelectedDevice(device);
    setSaveFeedback('');
  };

  const handleBindInput = (input: SmashInput) => {
    setIsTesting(false);
    setSaveFeedback('');
    setEditingInput(input);
    startListeningForInput(input, selectedPlayerIndex, selectedDevice);
  };

  const handleCancelBind = () => {
    setEditingInput(null);
    stopListeningForInput();
  };

  const handleResetToDefault = () => {
    const player = state.players[selectedPlayerIndex];
    if (!player) return;

    const defaults = createKeybindsWithDefault({}, selectedPlayerIndex);
    const resetBindings: PlayerKeybinds = { ...player.keybinds };
    for (const input of SMASH_INPUTS) {
      const key = `${selectedDevice}:${input}`;
      resetBindings[key] = defaults[key];
    }
    updatePlayerKeybinds(selectedPlayerIndex, resetBindings);
    setEditingInput(null);
    stopListeningForInput();
    setSaveFeedback('Default layout restored');
  };

  const handleSave = () => {
    localStorage.setItem('ultimateWebState', JSON.stringify(state));
    setSaveFeedback('Layout saved');
  };

  const selectedPlayer = state.players[selectedPlayerIndex] ?? state.players[0];
  const filledKeybinds = createKeybindsWithDefault(selectedPlayer?.keybinds || {}, selectedPlayerIndex);
  const connectedControllerLabel = gamepads.length > 0
    ? `${gamepads.length} controller${gamepads.length === 1 ? '' : 's'} connected`
    : 'No controller detected';

  const renderBindingRows = (rows: BindingRow[]) => rows.map(({ input, action, control }) => {
    const binding = filledKeybinds[`${selectedDevice}:${input}`];
    const displayName = binding ? getInputDisplayName(binding) : 'Not set';
    const isEditing = editingInput === input;

    return (
      <div className={`mapping-row ${isEditing ? 'is-listening' : ''}`} key={input}>
        <div className="mapping-action">
          <span className="hardware-key">{control}</span>
          <span className="mapping-action-name">{action}</span>
        </div>
        <button
          type="button"
          className={`binding-button ${isEditing ? 'editing' : ''}`}
          onClick={() => handleBindInput(input)}
          aria-label={`Rebind ${action} on ${control}; current binding ${displayName}`}
          aria-pressed={isEditing}
        >
          <span>{isEditing ? 'PRESS INPUT' : displayName}</span>
          <span className="binding-edit-mark">{isEditing ? '···' : 'EDIT'}</span>
        </button>
      </div>
    );
  });

  return (
    <main className="keybinds-screen controls-screen">
      <div className="controls-topline">
        <button className="back-button controls-back" onClick={handleBack}>
          <span aria-hidden="true">←</span> BACK
        </button>
        <div className="controls-breadcrumb">
          <span>OPTIONS</span>
          <span aria-hidden="true">›</span>
          <strong>{selectedPlayer?.name || 'PLAYER 1'}’S BUTTON SETTINGS</strong>
        </div>
        <span className="controls-version">CONTROL SETUP / 01</span>
      </div>

      <div className="controls-title-row">
        <div>
          <p className="controls-eyebrow">CUSTOMIZE YOUR FIGHTER</p>
          <h1>BUTTON SETTINGS</h1>
          <p className="controls-description">Choose a binding, then press the key or controller input you want to use.</p>
        </div>
        <div className="player-tabs" role="tablist" aria-label="Choose player">
          {state.players.map((player, index) => (
            <button
              key={player.id}
              type="button"
              role="tab"
              aria-selected={selectedPlayerIndex === index}
              className={`player-tab ${selectedPlayerIndex === index ? 'active' : ''}`}
              onClick={() => handlePlayerSelect(index)}
            >
              <span className="player-tab-index">P{index + 1}</span>
              <span>{player.name}</span>
            </button>
          ))}
        </div>
      </div>

      <section className="controls-toolbar" aria-label="Player and device settings">
        <label className="name-edit">
          <span>PLAYER NAME</span>
            <input
              type="text"
              value={selectedPlayer?.name || ''}
              onChange={handleNameChange}
              className="name-input"
              placeholder="Enter player name"
              maxLength={20}
            />
        </label>
        <div className="device-control">
          <span className="toolbar-label">INPUT DEVICE</span>
          <div className="device-selector" role="group" aria-label="Choose input device">
            <button
              type="button"
              className={`device-option ${selectedDevice === 'gamepad' ? 'active' : ''}`}
              aria-pressed={selectedDevice === 'gamepad'}
              onClick={() => handleDeviceSelect('gamepad')}
            >
              CONTROLLER
            </button>
            <button
              type="button"
              className={`device-option ${selectedDevice === 'keyboard' ? 'active' : ''}`}
              aria-pressed={selectedDevice === 'keyboard'}
              onClick={() => handleDeviceSelect('keyboard')}
            >
              KEYBOARD
            </button>
          </div>
        </div>
        <div className={`connection-status ${gamepads.length > 0 ? 'connected' : ''}`}>
          <span className="connection-dot" />
          <span>{selectedDevice === 'gamepad' ? connectedControllerLabel : 'Keyboard ready'}</span>
        </div>
      </section>

      <div className="mapping-board">
        <div className="mapping-layout">
          <div className="binding-bank binding-bank-left">
            <section className="mapping-group">
              <div className="bank-heading"><span>01</span><h2>Shoulder buttons</h2></div>
              {renderBindingRows(shoulderLeft)}
            </section>
            <section className="mapping-group">
              <div className="bank-heading"><span>02</span><h2>D-pad taunts</h2></div>
              {renderBindingRows(tauntControls)}
            </section>
          </div>

          <figure className="controller-figure" aria-label="Illustration of a game controller">
            <div className="controller-trigger-row">
              <span>ZL <i>Special</i></span>
              <span>ZR <i>Shield</i></span>
            </div>
            <div className="controller-body">
              <div className="controller-handle controller-handle-left" />
              <div className="controller-handle controller-handle-right" />
              <div className="controller-center">
                <span className="controller-brand">U / W</span>
                <span className="controller-stem" />
              </div>
              <div className="controller-stick controller-stick-left"><span /></div>
              <div className="controller-dpad">
                <span className="dpad-up">▲</span>
                <span className="dpad-left">◀</span>
                <span className="dpad-center" />
                <span className="dpad-right">▶</span>
                <span className="dpad-down">▼</span>
              </div>
              <div className="controller-face">
                <span className="face-x">X</span>
                <span className="face-y">Y</span>
                <span className="face-a">A</span>
                <span className="face-b">B</span>
              </div>
              <div className="controller-stick controller-stick-right"><span>R</span></div>
              <span className="controller-shoulder controller-shoulder-left">L</span>
              <span className="controller-shoulder controller-shoulder-right">R</span>
            </div>
            <figcaption>Select any assignment to change its input.</figcaption>
          </figure>

          <div className="binding-bank binding-bank-right">
            <section className="mapping-group">
              <div className="bank-heading"><span>03</span><h2>Shoulder buttons</h2></div>
              {renderBindingRows(shoulderRight)}
            </section>
            <section className="mapping-group">
              <div className="bank-heading"><span>04</span><h2>Face buttons & sticks</h2></div>
              {renderBindingRows(faceControls)}
            </section>
          </div>
        </div>

        <div className="lower-binding-grid">
          <section className="mapping-group movement-group">
            <div className="bank-heading"><span>05</span><h2>Movement · left stick</h2></div>
            <div className="compact-binding-grid">{renderBindingRows(movementControls)}</div>
          </section>
          <section className="mapping-group other-group">
            <div className="bank-heading"><span>06</span><h2>Other settings</h2></div>
            <div className="compact-binding-grid">{renderBindingRows(otherControls)}</div>
          </section>
        </div>

        {editingInput && (
          <div className="listening-indicator" role="status">
            <span className="pulse" />
            <span>Waiting for {selectedDevice === 'gamepad' ? 'controller input' : 'a key press'}…</span>
            <button type="button" className="cancel-bind" onClick={handleCancelBind}>CANCEL</button>
          </div>
        )}

        {isTesting && (
          <div className="test-feedback" role="status">
            <span className="test-live-dot" />
            <span>{testFeedback || 'Press any key or controller button to test your setup.'}</span>
            <button type="button" onClick={() => setIsTesting(false)}>STOP TEST</button>
          </div>
        )}

        <footer className="controls-footer">
          <button type="button" className="footer-utility" onClick={() => navigate('/settings')}>
            OTHER SETTINGS <span aria-hidden="true">↗</span>
          </button>
          <div className="footer-status" aria-live="polite">{saveFeedback || 'Changes save to this browser.'}</div>
          <div className="footer-actions">
            <button type="button" className="footer-utility" onClick={handleResetToDefault}>
              RESET DEFAULT
            </button>
            <button
              type="button"
              className={`test-button ${isTesting ? 'active' : ''}`}
              onClick={() => {
                setEditingInput(null);
                stopListeningForInput();
                setTestFeedback('');
                setIsTesting((current) => !current);
              }}
            >
              {isTesting ? 'STOP TEST' : 'TEST'}
            </button>
            <button type="button" className="save-button" onClick={handleSave}>
              <span aria-hidden="true">＋</span> SAVE
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
};

export default KeybindsScreen;
