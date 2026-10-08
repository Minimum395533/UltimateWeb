import React from 'react';
import { useGameState } from '../hooks/useGameState';
import '../styles/StartScreen.css';

const StartScreen: React.FC = () => {
  const { navigateTo } = useGameState();

  return (
    <div className="start-screen">
      <div className="background-overlay" />
      
      {/* Title */}
      <div className="title-container">
        <h1 className="title">ULTIMATE WEB</h1>
        <p className="subtitle">A Smash Bros. Recreation</p>
      </div>

      {/* Main Menu Grid - 4 corners + center */}
      <div className="menu-grid">
        <div className="menu-corner top-left">
          <button 
            className="menu-button" 
            onClick={() => navigateTo('training')}
          >
            <span className="button-icon">🎯</span>
            <span className="button-label">TRAINING</span>
          </button>
        </div>

        <div className="menu-corner top-right">
          <button 
            className="menu-button" 
            onClick={() => navigateTo('keybinds')}
          >
            <span className="button-icon">⌨️</span>
            <span className="button-label">NAMES/KEYBINDS</span>
          </button>
        </div>

        <div className="menu-corner bottom-left">
          <button 
            className="menu-button" 
            onClick={() => navigateTo('settings')}
          >
            <span className="button-icon">⚙️</span>
            <span className="button-label">SETTINGS</span>
          </button>
        </div>

        <div className="menu-corner bottom-right">
          <button 
            className="menu-button" 
            onClick={() => navigateTo('online')}
          >
            <span className="button-icon">🌐</span>
            <span className="button-label">ONLINE PLAY</span>
          </button>
        </div>

        {/* Center - Circular Local Play Button */}
        <div className="menu-center">
          <button 
            className="local-play-button" 
            onClick={() => navigateTo('local')}
          >
            <span className="local-play-icon">⚔️</span>
            <span className="local-play-label">LOCAL PLAY</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="footer">
        <p>Press START to begin</p>
      </div>
    </div>
  );
};

export default StartScreen;
