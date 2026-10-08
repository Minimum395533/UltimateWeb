import React from 'react';
import { useGameState } from '../hooks/useGameState';
import '../styles/SettingsScreen.css';

const SettingsScreen: React.FC = () => {
  const { state, updateGameSettings, navigateTo } = useGameState();

  const handleBack = () => {
    navigateTo('start');
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
          <p>Configure keybinds in the NAMES/KEYBINDS menu.</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;
