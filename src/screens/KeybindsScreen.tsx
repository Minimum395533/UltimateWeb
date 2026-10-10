import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { useInput } from '../hooks/useInput';
import { CONTROLLER_BUTTONS } from '../types';
import type { ButtonAction, ButtonActionMap, ControllerButton, ControllerType } from '../types';
import { DEFAULT_CONTROLLER_SETTINGS, getDefaultButtonActions } from '../physics/controllerSettings';
import '../styles/KeybindsScreen.css';

const ACTION_LABELS: Record<ButtonAction, string> = {
  attack: 'Attack', special: 'Special', jump: 'Jump', shield: 'Shield', grab: 'Grab',
  smash: 'Smash Attack', tilt: 'Tilt Attack', 'taunt-up': 'Up Taunt',
  'taunt-side': 'Side Taunt', 'taunt-down': 'Down Taunt', none: 'Nothing',
};
const FACE: ButtonAction[] = ['attack', 'special', 'jump', 'shield', 'grab', 'smash', 'tilt', 'none'];
const SHOULDER: ButtonAction[] = ['shield', 'grab', 'jump', 'attack', 'special', 'smash', 'none'];
const DIRECTION: Record<string, ButtonAction[]> = {
  DUp: ['taunt-up', 'none'], DDown: ['taunt-down', 'none'],
  DLeft: ['taunt-side', 'none'], DRight: ['taunt-side', 'none'],
};
const KEY_BUTTONS: ControllerButton[] = ['KeyJ', 'KeyK', 'KeyL', 'KeyU', 'KeyI', 'KeyO', 'Space', 'Enter'];
const FIXED_KEYS = ['W', 'A', 'S', 'D'];
const physicalName: Record<ControllerButton, string> = {
  A: 'A', B: 'B', X: 'X', Y: 'Y', L: 'L', R: 'R', Z: 'Z', ZL: 'ZL', ZR: 'ZR',
  SL: 'SL', SR: 'SR', Plus: '+', Minus: '−', L3: 'L Stick', R3: 'R Stick',
  DUp: '↑', DDown: '↓', DLeft: '←', DRight: '→',
  KeyW: 'W', KeyA: 'A', KeyS: 'S', KeyD: 'D', KeyJ: 'J', KeyK: 'K',
  KeyL: 'L', KeyU: 'U', KeyI: 'I', KeyO: 'O', Space: 'Space', Enter: 'Enter',
};
const buttonActions = (button: ControllerButton): ButtonAction[] =>
  DIRECTION[button] ?? (button === 'R3' ? ['smash', 'tilt', 'special', 'none']
    : ['L', 'R', 'Z', 'ZL', 'ZR', 'SL', 'SR'].includes(button) ? SHOULDER : FACE);

const KeybindsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { state, selectPlayerForEdit, updatePlayerName, updatePlayerControllerSettings, updatePlayer } = useGameState();
  const { gamepads } = useInput();
  const [playerIndex, setPlayerIndex] = useState(state.selectedPlayerIndex ?? 0);
  const [controller, setController] = useState<ControllerType>(state.players[state.selectedPlayerIndex ?? 0]?.controllerType ?? 'pro');
  const [selected, setSelected] = useState<ControllerButton | null>('A');
  const [testing, setTesting] = useState(false);
  const [liveInput, setLiveInput] = useState('Press a button or move a stick to test.');
  const [saved, setSaved] = useState(false);
  const player = state.players[playerIndex] ?? state.players[0];
  const settings = player?.controllerSettings ?? DEFAULT_CONTROLLER_SETTINGS;
  const bindings: ButtonActionMap = useMemo(() => ({
    ...getDefaultButtonActions(controller),
    ...(player?.buttonSettings?.[controller] ?? {}),
  }), [controller, player?.buttonSettings]);
  const buttonList = controller === 'keyboard' ? KEY_BUTTONS : CONTROLLER_BUTTONS[controller];
  const selectedActions = selected ? buttonActions(selected) : [];
  const actionFor = (button: ControllerButton) => bindings[button] ?? 'none';

  React.useEffect(() => {
    if (!testing) return;
    const onKey = (event: KeyboardEvent) => setLiveInput(`Keyboard · ${event.key === ' ' ? 'Space' : event.key}`);
    const timer = window.setInterval(() => {
      for (const [padIndex, pad] of Array.from(navigator.getGamepads?.() ?? []).entries()) {
        if (!pad) continue;
        const pressed = pad.buttons.findIndex((button) => button.pressed);
        if (pressed !== -1) {
          const names = ['B', 'A', 'Y', 'X', 'L', 'R', 'ZL', 'ZR', '−', '+'];
          const physical = names[pressed] ?? `Button ${pressed}`;
          const assigned = Object.entries(bindings).find(([key]) => physicalName[key as ControllerButton] === physical)?.[1];
          setLiveInput(`${pad.id || `Controller ${padIndex + 1}`} · ${physical} → ${assigned ? ACTION_LABELS[assigned] : 'Unassigned'}`);
          return;
        }
        if (pad.axes.length >= 2 && (Math.abs(pad.axes[0]) > 0.2 || Math.abs(pad.axes[1]) > 0.2)) {
          setLiveInput(`${pad.id || 'Controller'} · Left stick ${pad.axes[0].toFixed(2)}, ${pad.axes[1].toFixed(2)} → movement`);
          return;
        }
        if (pad.axes.length >= 4 && (Math.abs(pad.axes[2]) > 0.2 || Math.abs(pad.axes[3]) > 0.2)) {
          const action = bindings.R3 ? ACTION_LABELS[bindings.R3] : 'Unassigned';
          setLiveInput(`${pad.id || 'Controller'} · C-Stick ${pad.axes[2].toFixed(2)}, ${pad.axes[3].toFixed(2)} → ${action}`);
          return;
        }
      }
    }, 50);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); window.clearInterval(timer); };
  }, [testing, bindings]);
  const connected = gamepads[0]?.id ?? '';
  const gamepadLabel = useMemo(() => connected ? `${connected} · Switch button labels` : 'No controller detected', [connected]);

  const updateButton = (action: ButtonAction) => {
    if (!player || !selected) return;
    const next = { ...(player.buttonSettings ?? {}), [controller]: { ...bindings, [selected]: action } };
    updatePlayer(playerIndex, { buttonSettings: next });
    setSaved(false);
  };
  const updateSetting = (patch: Partial<typeof settings>) => {
    if (player) updatePlayerControllerSettings(playerIndex, { ...settings, ...patch });
    setSaved(false);
  };
  const reset = () => {
    if (!player) return;
    updatePlayer(playerIndex, { buttonSettings: { ...(player.buttonSettings ?? {}), [controller]: getDefaultButtonActions(controller) } });
    updatePlayerControllerSettings(playerIndex, { ...DEFAULT_CONTROLLER_SETTINGS });
    setSaved(false);
  };
  const save = () => { localStorage.setItem('ultimateWebState', JSON.stringify(state)); setSaved(true); };
  const setPlayer = (index: number) => { setPlayerIndex(index); selectPlayerForEdit(index); setSelected(null); };

  return <main className="keybinds-screen controls-screen ultimate-controls">
    <header className="controls-topline">
      <button className="back-button controls-back" onClick={() => navigate('/')}><span>←</span> BACK</button>
      <div className="controls-breadcrumb"><span>OPTIONS</span><span>›</span><strong>{player?.name || 'PLAYER'}’S BUTTON SETTINGS</strong></div>
      <span className="controls-version">CONTROL SETUP / 01</span>
    </header>
    <div className="controls-title-row">
      <div><p className="controls-eyebrow">CUSTOMIZE YOUR FIGHTER</p><h1>BUTTON SETTINGS</h1><p className="controls-description">Choose a player and assign an action to each physical button.</p></div>
      <div className="player-tabs" aria-label="Player profiles">{state.players.map((item, index) =>
        <button key={item.id} className={`player-tab ${index === playerIndex ? 'active' : ''}`} onClick={() => setPlayer(index)}>
          <span className="player-tab-index">P{index + 1}</span><span>{item.name}</span>
        </button>)}</div>
    </div>
    <section className="ultimate-controls-toolbar">
      <label>PLAYER NAME<input value={player?.name ?? ''} maxLength={20} onChange={(event) => { updatePlayerName(playerIndex, event.target.value); setSaved(false); }} /></label>
      <label>CONTROLLER TYPE<select value={controller} onChange={(event) => { const type = event.target.value as ControllerType; setController(type); if (player) updatePlayer(playerIndex, { controllerType: type }); setSelected(null); setSaved(false); }}>
        <option value="pro">Pro Controller / dual Joy-Con</option><option value="gamecube">GameCube Controller</option><option value="joycon-sideways">Sideways Joy-Con</option><option value="keyboard">Keyboard (PC)</option>
      </select></label>
      <span className={`ultimate-gamepad-status ${connected ? 'is-connected' : ''}`}>● {connected ? gamepadLabel : controller === 'keyboard' ? 'Keyboard ready' : gamepadLabel}</span>
    </section>
    <section className="ultimate-controls-board">
      <div className="ultimate-callouts ultimate-callouts-left">
        {buttonList.filter((button) => ['L', 'ZL', 'DUp', 'DDown', 'DLeft', 'DRight'].includes(button)).map((button) =>
          <button key={button} className={`ultimate-callout ${selected === button ? 'is-selected' : ''}`} onClick={() => setSelected(button)}>
            <span>{ACTION_LABELS[actionFor(button)]}</span><b>{physicalName[button]}</b>
          </button>)}
      </div>
      {controller === 'keyboard' ? <div className="ultimate-keyboard">
        <p>KEYBOARD · SELECT A KEY TO ASSIGN ITS ACTION</p><div>{FIXED_KEYS.map((key) => <span className="keyboard-fixed" key={key}>{key}<small>Move</small></span>)}{KEY_BUTTONS.map((key) => <button key={key} className={selected === key ? 'is-selected' : ''} onClick={() => setSelected(key)}>{physicalName[key]}<small>{ACTION_LABELS[actionFor(key)]}</small></button>)}</div>
        <small>WASD movement and pause are fixed. Other keys can be assigned actions below.</small>
      </div> : <div className={`ultimate-controller-illustration ${controller}`}>
        <div className="controller-fixed stick-left">CONTROL<br/>STICK</div>
        <div className="controller-center-mark">{controller === 'gamecube' ? 'GC' : controller === 'joycon-sideways' ? 'JOY-CON' : 'SMASH'}</div>
        {buttonList.filter((button) => !['DUp', 'DDown', 'DLeft', 'DRight', 'L3'].includes(button)).map((button) =>
          <button key={button} className={`ultimate-physical-button button-${button.toLowerCase()} ${selected === button ? 'is-selected' : ''}`}
            onClick={() => setSelected(button)} aria-label={`${physicalName[button]}: ${ACTION_LABELS[actionFor(button)]}`}>
            <b>{physicalName[button]}</b><small>{ACTION_LABELS[actionFor(button)]}</small>
          </button>)}
        <div className="ultimate-dpad">{buttonList.filter((button) => button.startsWith('D')).map((button) =>
          <button key={button} className={`ultimate-physical-button dpad-${button.slice(1).toLowerCase()} ${selected === button ? 'is-selected' : ''}`} onClick={() => setSelected(button)}>{physicalName[button]}</button>)}</div>
        <span className="controller-fixed start-fixed">+ / −<small>Start / Pause · fixed</small></span>
      </div>}
      <div className="ultimate-callouts ultimate-callouts-right">
        {buttonList.filter((button) => ['R', 'ZR', 'A', 'B', 'X', 'Y', 'R3'].includes(button)).map((button) =>
          <button key={button} className={`ultimate-callout ${selected === button ? 'is-selected' : ''}`} onClick={() => setSelected(button)}>
            <b>{physicalName[button]}</b><span>{button === 'R3' ? 'C-Stick · ' : ''}{ACTION_LABELS[actionFor(button)]}</span>
          </button>)}
      </div>
    </section>
    <section className="ultimate-controls-bottom">
      <div className="ultimate-settings">
        <h2>Other Settings</h2>
        <label><input type="checkbox" checked={settings.rumbleEnabled} onChange={(event) => updateSetting({ rumbleEnabled: event.target.checked })}/> Rumble</label>
        <label><input type="checkbox" checked={settings.abSmashEnabled} onChange={(event) => updateSetting({ abSmashEnabled: event.target.checked })}/> A+B Smash</label>
        <label><input type="checkbox" checked={settings.stickJumpEnabled} onChange={(event) => updateSetting({ stickJumpEnabled: event.target.checked })}/> Stick Jump</label>
        <label>Stick Sensitivity<select value={settings.stickSensitivity} onChange={(event) => updateSetting({ stickSensitivity: event.target.value as typeof settings.stickSensitivity })}>
          <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></label>
      </div>
      <div className="ultimate-action-picker">
        <h2>{selected ? `${physicalName[selected]} Button` : 'Select a button'}</h2>
        <p>{selected === 'R3' ? 'C-Stick options' : 'Choose the action for this physical button.'}</p>
        <div>{selectedActions.map((action) => <button key={action} className={actionFor(selected!) === action ? 'is-active' : ''} onClick={() => updateButton(action)}>{ACTION_LABELS[action]}</button>)}</div>
      </div>
    </section>
    {testing && <div className="ultimate-test-status" role="status">{liveInput}</div>}
    <footer className="ultimate-controls-footer">
      <button onClick={() => navigate('/settings')}>OTHER SETTINGS</button>
      <span>{saved ? 'Saved to this browser' : 'Changes save to this browser profile'}</span>
      <div><button onClick={reset}>DEFAULT</button><button className={testing ? 'is-active' : ''} onClick={() => setTesting(!testing)}>{testing ? 'STOP TEST' : 'TEST'}</button><button className="save-button" onClick={save}>SAVE</button></div>
    </footer>
  </main>;
};

export default KeybindsScreen;
