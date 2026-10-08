import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import {
  getFastInputWindowFrames,
  normalizeControllerSettings,
} from '../physics/controllerSettings';
import '../styles/SettingsScreen.css';

const SettingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    state,
    updateGameSettings,
    updatePlayerControllerSettings,
  } = useGameState();
  const [manualControllerPlayer, setManualControllerPlayer] = useState<number | null>(null);
  const controllerPlayerIndex = manualControllerPlayer ?? state.selectedPlayerIndex ?? 0;
  const controllerPlayer = state.players[controllerPlayerIndex] ?? state.players[0];
  const controllerSettings = normalizeControllerSettings(controllerPlayer?.controllerSettings);

  const handleBack = () => {
    navigate('/');
  };

  const handleStocksChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 3;
    updateGameSettings({ stockCount: Math.max(1, Math.min(9, value)) });
  };

  const handleTimeLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 300;
    updateGameSettings({ timeLimit: Math.max(0, Math.min(999, value)) });
  };

  const handleDamageRatioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 1.0;
    updateGameSettings({ damageRatio: Math.max(0.1, Math.min(3.0, value)) });
  };

  const updateControllerSettings = (
    updates: Partial<typeof controllerSettings>,
  ) => {
    if (!controllerPlayer) return;
    updatePlayerControllerSettings(controllerPlayerIndex, {
      ...controllerSettings,
      ...updates,
    });
  };

  return (
    <div className="settings-screen">
      <div className="background-overlay" />
      
      <div className="header">
        <button className="back-button" onClick={handleBack}>
          ← BACK
        </button>
        <h1>SETTINGS</h1>
        <div className="header-spacer" />
      </div>

      <div className="content">
        <div className="settings-section">
          <h2>Game Settings</h2>
          
          <div className="setting-row">
            <label>Stocks</label>
            <input
              type="number"
              value={state.gameSettings.stockCount || 3}
              onChange={handleStocksChange}
              min="1"
              max="9"
              className="setting-input"
            />
          </div>

          <div className="setting-row">
            <label>Time Limit (seconds)</label>
            <input
              type="number"
              value={state.gameSettings.timeLimit || 300}
              onChange={handleTimeLimitChange}
              min="0"
              max="999"
              className="setting-input"
            />
          </div>

          <div className="setting-row">
            <label>Damage Ratio</label>
            <input
              type="number"
              value={state.gameSettings.damageRatio || 1.0}
              onChange={handleDamageRatioChange}
              min="0.1"
              max="3.0"
              step="0.1"
              className="setting-input"
            />
          </div>
        </div>

        <div className="settings-section">
          <h2>Display</h2>
          <div className="setting-row">
            <label>Hitbox Visualization</label>
            <select className="setting-input">
              <option value="always">Always On</option>
              <option value="on-hit">On Hit Only</option>
              <option value="off">Off</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h2>Controls</h2>
          <div className="setting-row">
            <label htmlFor="controller-player">Controller profile</label>
            <select
              id="controller-player"
              className="setting-input"
              value={controllerPlayerIndex}
              onChange={(event) => setManualControllerPlayer(Number(event.target.value))}
            >
              {state.players.map((player, index) => (
                <option key={player.id} value={index}>{player.name}</option>
              ))}
            </select>
          </div>
          <div className="setting-row">
            <label htmlFor="stick-jump">Stick Jump</label>
            <input
              id="stick-jump"
              className="setting-checkbox"
              type="checkbox"
              checked={controllerSettings.stickJumpEnabled}
              onChange={(event) => updateControllerSettings({
                stickJumpEnabled: event.target.checked,
              })}
            />
          </div>
          <p className="controller-setting-help">
            When enabled, tilting the left stick up triggers a jump. Jump buttons work either way; hold through the 3-frame squat for a full hop or release during it for a short hop.
          </p>
          <div className="setting-row sensitivity-setting">
            <label htmlFor="stick-sensitivity">Stick Sensitivity</label>
            <div className="sensitivity-control">
              <input
                id="stick-sensitivity"
                className="sensitivity-range"
                type="range"
                min="0"
                max="100"
                step="1"
                value={controllerSettings.stickSensitivity}
                onChange={(event) => updateControllerSettings({
                  stickSensitivity: Number(event.target.value),
                })}
              />
              <output htmlFor="stick-sensitivity">
                {controllerSettings.stickSensitivity}% · {getFastInputWindowFrames(controllerSettings)} frames
              </output>
            </div>
          </div>
          <p className="controller-setting-help">
            Higher sensitivity allows more time for a quick stick flick to register as a dash. The same setting is ready for future attack-input recognition.
          </p>
          <p>Rebind every keyboard and controller input in Button Settings.</p>
          <button
            type="button"
            className="controls-link"
            onClick={() => navigate('/keybinds')}
          >
            Open button settings <span aria-hidden="true">↗</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;
