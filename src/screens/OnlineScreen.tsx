import React from 'react';
import { useGameState } from '../hooks/useGameState';
import '../styles/OnlineScreen.css';

const OnlineScreen: React.FC = () => {
  const { navigateTo } = useGameState();

  const handleBack = () => {
    navigateTo('start');
  };

  return (
    <div className="online-screen">
      <div className="background-overlay" />
      
      <div className="header">
        <button className="back-button" onClick={handleBack}>
          ← BACK
        </button>
        <h1>ONLINE PLAY</h1>
        <div className="header-spacer" />
      </div>

      <div className="content">
        <div className="coming-soon">
          <h2>STRETCH GOAL - NOT YET ACTIVE</h2>
          <p>Online play will be implemented in a future update.</p>
          <p>Planned features:</p>
          <ul>
            <li>Peer-to-peer connection</li>
            <li>Rollback netcode for smooth gameplay</li>
            <li>Matchmaking system</li>
            <li>Custom rooms with shareable codes</li>
            <li>Spectator mode</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default OnlineScreen;
