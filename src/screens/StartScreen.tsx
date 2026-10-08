import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/StartScreen.css';

const StartScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="start-screen">
      <div className="background-overlay" />
      
      <div className="title-container">
        <h1 className="title">ULTIMATE WEB</h1>
        <p className="subtitle">A Smash Bros. Recreation</p>
      </div>

      <div className="menu-grid">
        <div className="menu-corner top-left">
          <button 
            className="menu-button" 
            onClick={() => navigate('/training')}
          >
            <span className="button-icon">🎯</span>
            <span className="button-label">TRAINING</span>
          </button>
        </div>

        <div className="menu-corner top-right">
          <button 
            className="menu-button" 
            onClick={() => navigate('/keybinds')}
          >
            <span className="button-icon">⌨️</span>
            <span className="button-label">NAMES/KEYBINDS</span>
          </button>
        </div>

        <div className="menu-corner bottom-left">
          <button 
            className="menu-button" 
            onClick={() => navigate('/settings')}
          >
            <span className="button-icon">⚙️</span>
            <span className="button-label">SETTINGS</span>
          </button>
        </div>

        <div className="menu-corner bottom-right">
          <button 
            className="menu-button" 
            onClick={() => navigate('/online')}
          >
            <span className="button-icon">🌐</span>
            <span className="button-label">ONLINE PLAY</span>
          </button>
        </div>

        <div className="menu-center">
          <button 
            className="local-play-button" 
            onClick={() => navigate('/local')}
          >
            <span className="local-play-icon">⚔️</span>
            <span className="local-play-label">LOCAL PLAY</span>
          </button>
        </div>
      </div>

      <div className="footer">
        <p>Press START to begin</p>
      </div>
    </div>
  );
};

export default StartScreen;
