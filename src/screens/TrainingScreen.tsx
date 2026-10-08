import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/TrainingScreen.css';

const TrainingScreen: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="training-screen">
      <div className="background-overlay" />
      
      <div className="header">
        <button className="back-button" onClick={handleBack}>
          ← BACK
        </button>
        <h1>TRAINING MODE</h1>
        <div className="header-spacer" />
      </div>

      <div className="content">
        <div className="coming-soon">
          <h2>COMING SOON</h2>
          <p>Training mode with frame-by-frame debugging will be implemented in a future update.</p>
          <p>Features planned:</p>
          <ul>
            <li>Frame stepping (1 frame at a time)</li>
            <li>Hitbox/hurtbox visualization</li>
            <li>Input history display</li>
            <li>Character state debugging</li>
            <li>Customizable training options</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TrainingScreen;
