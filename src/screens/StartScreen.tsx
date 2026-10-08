import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/StartScreen.css';

const modes = [
  {
    route: '/local',
    number: '01',
    eyebrow: 'LOCAL BATTLE',
    label: 'SMASH',
    detail: 'Choose fighters and play side by side.',
    tone: 'smash',
  },
  {
    route: '/training',
    number: '02',
    eyebrow: 'PRACTICE',
    label: 'TRAINING',
    detail: 'Explore the practice room.',
    tone: 'training',
  },
  {
    route: '/keybinds',
    number: '03',
    eyebrow: 'GAMES & MORE',
    label: 'CONTROLS',
    detail: 'Set up your keyboard or controller.',
    tone: 'controls',
  },
  {
    route: '/online',
    number: '04',
    eyebrow: 'VERSUS',
    label: 'ONLINE',
    detail: 'Online matches are coming soon.',
    tone: 'online',
  },
];

const StartScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <main className="start-screen">
      <div className="background-overlay" />

      <div className="start-shell">
        <header className="arena-header">
          <div className="arena-brand">
            <span className="brand-mark">U<span>W</span></span>
            <span className="brand-name">ULTIMATE<span>WEB</span></span>
          </div>
          <span className="arena-status"><i /> LOCAL BUILD · READY</span>
        </header>

        <section className="title-container">
          <p className="start-kicker">PICK YOUR NEXT MOVE</p>
          <h1 className="title">Choose your <span>mode.</span></h1>
          <p className="subtitle">A fan-made arena for quick local battles and practice.</p>
        </section>

        <section className="menu-grid" aria-label="Game modes">
          {modes.map((mode) => (
            <button
              key={mode.route}
              type="button"
              className={`mode-tile mode-tile-${mode.tone}`}
              onClick={() => navigate(mode.route)}
            >
              <span className="mode-tile-top">
                <span>{mode.number} / {mode.eyebrow}</span>
                <span aria-hidden="true">↗</span>
              </span>
              <span className="mode-tile-bottom">
                <span>
                  <span className="mode-label">{mode.label}</span>
                  <span className="mode-detail">{mode.detail}</span>
                </span>
                <span className="mode-orbit" aria-hidden="true">{mode.number}</span>
              </span>
            </button>
          ))}
          <div className="arena-medallion" aria-hidden="true">
            <span className="medallion-ring" />
            <span className="medallion-mark">U<span>W</span></span>
            <span className="medallion-caption">READY?</span>
          </div>
        </section>

        <footer className="start-footer">
          <span>LOCAL PLAY · PRACTICE · CONTROLS</span>
          <button type="button" onClick={() => navigate('/settings')}>SETTINGS <span aria-hidden="true">↗</span></button>
        </footer>
      </div>
    </main>
  );
};

export default StartScreen;
