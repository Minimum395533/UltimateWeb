import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { characters, getColorByIndex } from '../data/characters';
import { APPROVED_ANIMATIONS } from '../data/falcon/approvedAnimations';
import { ANIMATION_CATALOG } from '../data/falcon/animationCatalog';
import { resolveAnimationClip } from '../data/falcon/trainingClips';
import type { AnimationClip } from '../dev/animationPreview';
import { readTrainingControlInput } from '../physics/trainingInput';
import type { GamepadSnapshot } from '../physics/trainingInput';
import {
  createInitialTrainingMovementState, stepTrainingMovement,
  TRAINING_BLASTZONE_BOUNDS, TRAINING_CAMERA_LIMITS, TRAINING_SIMULATION_HZ,
} from '../physics/trainingMovement';
import type { TrainingMovementState } from '../physics/trainingMovement';
import {
  applyReaction, calculateHitReaction, CAPTAIN_FALCON_WEIGHT, stepLaunch, staleQueueAfterMove,
} from '../physics/combat';
import type { CombatantRuntime } from '../physics/combat';
import { collisionCanDealDamage, defaultTrainingHurtboxes, resolveHitboxCollisions } from '../physics/hitboxCollision';
import type { CollisionHistory, CombatantFrame } from '../physics/hitboxCollision';
import { classifyNormalAttack } from '../physics/normalAttacks';
import { normalizeControllerSettings } from '../physics/controllerSettings';
import {
  advanceLocalMatchRules, countdownLabel, createLocalMatchRules, formatMatchTime,
  loseLocalMatchStock, resolveLocalMatchTimeout,
} from '../physics/localMatchRules';
import type { LocalMatchRules } from '../physics/localMatchRules';
import type { PlayerProfile } from '../types';
import '../styles/LocalMatch.css';

interface Fighter {
  profile: PlayerProfile;
  movement: TrainingMovementState;
  percent: number;
  stocks: number;
  damageDealt: number;
  kos: number;
  falls: number;
  staleQueue: string[];
  attack: { id: string; frameIndex: number; clip: AnimationClip } | null;
  runtime: CombatantRuntime;
  previous: { attack: boolean; tilt: boolean; smash: boolean; special: boolean };
  respawnFrames: number;
  invulnerableFrames: number;
}
interface MatchSetup { players?: PlayerProfile[]; gameSettings?: { stockCount?: number; timeLimit?: number; damageRatio?: number } }

const makeFighter = (profile: PlayerProfile, index: number, stocks: number): Fighter => {
  const movement = { ...createInitialTrainingMovementState(), positionX: (-1 + index * 2) * 20 as TrainingMovementState['positionX'], facingDirection: index === 0 ? 1 as const : -1 as const };
  return {
    profile, movement, percent: 0, stocks, damageDealt: 0, kos: 0, falls: 0, staleQueue: [],
    attack: null,
    runtime: { percent: 0, positionX: Number(movement.positionX), positionY: 0, velocityX: 0, velocityY: 0, hitlagFrames: 0, hitstunFrames: 0, ko: false },
    previous: { attack: false, tilt: false, smash: false, special: false }, respawnFrames: 0, invulnerableFrames: 0,
  };
};
const PLAYER_TWO_KEYBOARD_ACTIONS: Readonly<Record<string, string>> = {
  KeyJ: 'Numpad1', Space: 'Numpad8', KeyK: 'Numpad2', KeyL: 'Numpad3',
  KeyU: 'Numpad4', KeyI: 'Numpad5', KeyO: 'Numpad6', KeyW: 'KeyP',
  KeyA: 'KeyN', KeyD: 'KeyB', KeyS: 'KeyM', Enter: 'NumpadEnter',
};

const MatchScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state: appState } = useGameState();
  const setup = (location.state ?? {}) as MatchSetup;
  const profiles = setup.players?.length === 2 ? setup.players : appState.players.slice(0, 2);
  const settings = setup.gameSettings ?? appState.gameSettings;
  const stockCount = settings.stockCount ?? 3;
  const timeLimit = settings.timeLimit ?? 420;
  const [rules, setRules] = useState<LocalMatchRules>(() => createLocalMatchRules(stockCount, timeLimit));
  const rulesRef = useRef(rules);
  const fightersRef = useRef<Fighter[]>(profiles.map((profile, index) => makeFighter(profile, index, stockCount)));
  const [hud, setHud] = useState(() => fightersRef.current.map((fighter) => ({ percent: fighter.percent, stocks: fighter.stocks, name: fighter.profile.name, damageDealt: 0, kos: 0, falls: 0 })));
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [completed, setCompleted] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [camera, setCamera] = useState({ x: 0, width: 150 });
  const keys = useRef(new Set<string>());
  const newKeys = useRef(new Set<string>());
  const collisionHistory = useRef(new Map<string, CollisionHistory>());
  const pausedPhaseRef = useRef<'playing' | 'sudden-death'>('playing');

  function togglePause() {
    if (rulesRef.current.phase === 'finished' || rulesRef.current.phase === 'countdown') return;
    const nextPaused = !pausedRef.current;
    pausedRef.current = nextPaused;
    setPaused(nextPaused);
    if (nextPaused && (rulesRef.current.phase === 'playing' || rulesRef.current.phase === 'sudden-death')) {
      pausedPhaseRef.current = rulesRef.current.phase;
      const next = { ...rulesRef.current, phase: 'paused' as const };
      rulesRef.current = next; setRules(next);
    } else if (!nextPaused && rulesRef.current.phase === 'paused') {
      const next = { ...rulesRef.current, phase: pausedPhaseRef.current };
      rulesRef.current = next; setRules(next);
    }
  }

  useEffect(() => { rulesRef.current = rules; }, [rules]);
  useEffect(() => {
    if (profiles.length !== 2) navigate('/local', { replace: true });
  }, [navigate, profiles.length]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        event.preventDefault();
        if (event.repeat) return;
        togglePause();
      }
      if (!keys.current.has(event.code)) newKeys.current.add(event.code);
      keys.current.add(event.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.code);
    const blur = () => { keys.current.clear(); newKeys.current.clear(); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, []);

  useEffect(() => {
    let request = 0;
    let previous = 0;
    let accumulator = 0;
    let frame = 0;
    const loop = (time: number) => {
      if (previous) accumulator += Math.min(time - previous, 100);
      previous = time;
      while (accumulator >= 1000 / TRAINING_SIMULATION_HZ) {
        accumulator -= 1000 / TRAINING_SIMULATION_HZ;
        const currentRules = rulesRef.current;
        if (currentRules.phase === 'countdown') {
          const next = advanceLocalMatchRules(currentRules);
          rulesRef.current = next;
          if (next.phase !== currentRules.phase || frame % 6 === 0) setRules(next);
        } else if (!pausedRef.current && (currentRules.phase === 'playing' || currentRules.phase === 'sudden-death')) {
          const pads: GamepadSnapshot[] = Array.from(navigator.getGamepads?.() ?? []).filter((pad): pad is Gamepad => pad !== null);
          const padSlots = fightersRef.current.map((fighter) => {
            if (fighter.profile.controllerType === 'keyboard') return { type: 'keyboard' as const, index: undefined };
            const index = fightersRef.current.slice(0, fightersRef.current.indexOf(fighter))
              .filter((other) => other.profile.controllerType !== 'keyboard').length;
            return pads[index] ? { type: fighter.profile.controllerType ?? 'pro', index } : { type: 'keyboard' as const, index: undefined };
          });
          const inputs = fightersRef.current.map((fighter, index) => readTrainingControlInput(
            fighter.profile.keybinds, keys.current, pads, fighter.profile.controllerSettings,
            newKeys.current, fighter.profile.buttonSettings, padSlots[index].type,
            padSlots[index].index, index === 1 ? PLAYER_TWO_KEYBOARD_ACTIONS : {},
          ));
          newKeys.current.clear();
          for (let i = 0; i < 2; i += 1) {
            const fighter = fightersRef.current[i];
            const input = inputs[i];
            if (fighter.respawnFrames > 0) {
              fighter.respawnFrames -= 1;
              if (fighter.respawnFrames === 0) {
                fighter.movement = { ...createInitialTrainingMovementState(), positionX: (i === 0 ? -12 : 12) as TrainingMovementState['positionX'], facingDirection: i === 0 ? 1 : -1 };
                fighter.runtime = { percent: 0, positionX: Number(fighter.movement.positionX), positionY: 0, velocityX: 0, velocityY: 0, hitlagFrames: 0, hitstunFrames: 0, ko: false };
                fighter.percent = 0;
                fighter.invulnerableFrames = 90;
              }
              continue;
            }
            fighter.invulnerableFrames = Math.max(0, fighter.invulnerableFrames - 1);
            const attackId = classifyNormalAttack({
              attackPressed: input.actions.attack && !fighter.previous.attack,
              tiltPressed: input.actions.tilt && !fighter.previous.tilt,
              smashPressed: input.actions.smash && !fighter.previous.smash,
              horizontal: input.horizontal * fighter.movement.facingDirection, vertical: input.vertical,
              rightX: input.rightStickX * fighter.movement.facingDirection, rightY: input.rightStickY,
              airborne: !fighter.movement.isGrounded,
              dashAttack: input.actions.attack && !fighter.previous.attack && fighter.movement.mode === 'run',
              stickMode: fighter.profile.controllerSettings?.rightStickMode ?? 'smash', flick: false,
            });
            const specialPressed = input.actions.special && !fighter.previous.special;
            fighter.previous = { attack: input.actions.attack, tilt: input.actions.tilt, smash: input.actions.smash, special: input.actions.special };
            if (attackId && !fighter.attack) {
              const clip = resolveAnimationClip(attackId);
              if (clip) fighter.attack = { id: attackId, frameIndex: -1, clip };
            }
            if (specialPressed && !fighter.attack) {
              const move = input.vertical > 0.65 ? 'falcon-dive'
                : input.vertical < -0.65 ? 'falcon-kick'
                  : Math.abs(input.horizontal) > 0.65 ? 'raptor-boost' : 'falcon-punch';
              const moveId = move === 'falcon-dive' ? 'falcon-dive'
                : move === 'falcon-kick' ? (fighter.movement.isGrounded ? 'falcon-kick' : 'falcon-kick-air')
                  : move === 'raptor-boost' ? (fighter.movement.isGrounded ? 'raptor-boost' : 'raptor-boost-air')
                    : (fighter.movement.isGrounded ? 'falcon-punch' : 'falcon-punch-air');
              const clip = resolveAnimationClip(moveId);
              if (clip) fighter.attack = { id: moveId, frameIndex: -1, clip };
              if (move === 'falcon-dive' || !fighter.movement.isGrounded) {
                fighter.movement = {
                  ...fighter.movement, isGrounded: false,
                  velocityX: (move === 'raptor-boost' ? fighter.movement.facingDirection * 3 : move === 'falcon-kick' ? fighter.movement.facingDirection * 2.5 : 0) as TrainingMovementState['velocityX'],
                  velocityY: (move === 'falcon-dive' ? 3 : move === 'falcon-kick' ? -2 : Number(fighter.movement.velocityY)) as TrainingMovementState['velocityY'],
                };
              }
            }
            const oldX = Number(fighter.movement.positionX);
            const oldY = Number(fighter.movement.positionY);
            if (fighter.runtime.hitlagFrames > 0) {
              fighter.runtime = { ...fighter.runtime, hitlagFrames: fighter.runtime.hitlagFrames - 1 };
            } else if (fighter.runtime.hitstunFrames > 0) {
              fighter.runtime = stepLaunch(fighter.runtime, {
                left: Number(TRAINING_BLASTZONE_BOUNDS.left), right: Number(TRAINING_BLASTZONE_BOUNDS.right),
                bottom: Number(TRAINING_BLASTZONE_BOUNDS.bottom), top: Number(TRAINING_BLASTZONE_BOUNDS.top),
              });
              if (!fighter.runtime.ko && fighter.runtime.positionY <= 0 && fighter.runtime.velocityY < 0) {
                fighter.runtime = { ...fighter.runtime, positionY: 0, velocityY: 0, hitstunFrames: Math.max(0, fighter.runtime.hitstunFrames - 1) };
              }
              fighter.movement = {
                ...fighter.movement, positionX: fighter.runtime.positionX as TrainingMovementState['positionX'],
                positionY: fighter.runtime.positionY as TrainingMovementState['positionY'],
                velocityX: fighter.runtime.velocityX as TrainingMovementState['velocityX'],
                velocityY: fighter.runtime.velocityY as TrainingMovementState['velocityY'],
                isGrounded: fighter.runtime.positionY === 0 && fighter.runtime.velocityY === 0,
              };
            } else {
              fighter.movement = stepTrainingMovement(fighter.movement, input, normalizeControllerSettings(fighter.profile.controllerSettings));
              fighter.runtime = { ...fighter.runtime, positionX: Number(fighter.movement.positionX), positionY: Number(fighter.movement.positionY), velocityX: Number(fighter.movement.velocityX), velocityY: Number(fighter.movement.velocityY) };
            }
            if (fighter.movement.positionX === 0 && fighter.movement.positionY === 0 && (Math.abs(oldX) > 180 || oldY < -100)) fighter.runtime = { ...fighter.runtime, ko: true };
            if (fighter.runtime.ko) {
              fighter.falls += 1;
              fighter.respawnFrames = 90;
              fighter.runtime = { ...fighter.runtime, ko: false };
              const before = rulesRef.current;
              rulesRef.current = loseLocalMatchStock(before, i as 0 | 1);
              fightersRef.current[1 - i].kos += 1;
              setRules(rulesRef.current);
            }
            if (fighter.attack) {
              fighter.attack.frameIndex += 1;
              if (fighter.attack.frameIndex >= fighter.attack.clip.frames.length) fighter.attack = null;
            }
          }
          const frames = fightersRef.current.map((fighter) => fighter.attack?.clip.frames[fighter.attack.frameIndex]);
          const combatants: CombatantFrame[] = fightersRef.current.map((fighter, index) => ({
            id: `p${index}`, moveId: fighter.attack?.id ?? '', frame: fighter.attack?.frameIndex ?? -1,
            position: { x: Number(fighter.movement.positionX), y: Number(fighter.movement.positionY), z: 0 },
            facing: fighter.movement.facingDirection, grounded: fighter.movement.isGrounded,
            hitboxes: frames[index]?.hitboxes ?? [], hurtboxes: frames[index]?.hurtboxes.length ? frames[index]!.hurtboxes : defaultTrainingHurtboxes(),
          }));
          const collisions = resolveHitboxCollisions(combatants, collisionHistory.current);
          for (const hit of collisions.hits) {
            const attackerIndex = Number(hit.attackerId.slice(1));
            const targetIndex = Number(hit.targetId.slice(1));
            const attacker = fightersRef.current[attackerIndex];
            const target = fightersRef.current[targetIndex];
            if (target.invulnerableFrames > 0 || !collisionCanDealDamage(hit)) continue;
            const ratio = Math.max(0.1, Math.min(3, settings.damageRatio ?? 1));
            const reaction = calculateHitReaction({ ...hit.hitbox, damage: hit.hitbox.damage * ratio }, {
              percent: target.percent, weight: CAPTAIN_FALCON_WEIGHT, staleQueue: target.staleQueue,
              crouching: false, grounded: target.movement.isGrounded,
            }, hit.moveId, true);
            target.runtime = applyReaction(target.runtime, reaction, attacker.movement.facingDirection);
            target.percent = target.runtime.percent;
            target.movement = { ...target.movement, isGrounded: false, velocityX: target.runtime.velocityX as TrainingMovementState['velocityX'], velocityY: target.runtime.velocityY as TrainingMovementState['velocityY'] };
            attacker.damageDealt += reaction.damage;
            attacker.staleQueue = staleQueueAfterMove(attacker.staleQueue, hit.moveId);
          }
          let nextRules = advanceLocalMatchRules(rulesRef.current);
          nextRules = resolveLocalMatchTimeout(nextRules, [fightersRef.current[0].percent, fightersRef.current[1].percent]);
          if (nextRules.suddenDeath && !rulesRef.current.suddenDeath) {
            for (const fighter of fightersRef.current) {
              fighter.percent = 300;
              fighter.runtime = { ...fighter.runtime, percent: 300 };
            }
          }
          rulesRef.current = nextRules;
          if (nextRules.phase !== currentRules.phase || frame % 6 === 0) setRules(nextRules);
        }
        frame += 1;
        if (frame % 6 === 0) {
          setFrameCount(frame);
          const current = fightersRef.current;
          setHud(current.map((fighter) => ({ percent: fighter.percent, stocks: rulesRef.current.stocks[current.indexOf(fighter)], name: fighter.profile.name, damageDealt: fighter.damageDealt, kos: fighter.kos, falls: fighter.falls })));
          const left = Number(current[0].movement.positionX);
          const right = Number(current[1].movement.positionX);
          const spread = Math.abs(right - left);
          const width = Math.max(90, Math.min(240, spread * 1.65 + 70));
          setCamera({
            x: Math.max(Number(TRAINING_CAMERA_LIMITS.left), Math.min(Number(TRAINING_CAMERA_LIMITS.right), (left + right) / 2)),
            width,
          });
        }
      }
      request = requestAnimationFrame(loop);
    };
    request = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(request);
  }, [settings.damageRatio]);

  useEffect(() => {
    if (rules.phase === 'finished') setCompleted(true);
  }, [rules.phase]);

  const restart = () => {
    const next = createLocalMatchRules(stockCount, timeLimit);
    rulesRef.current = next; setRules(next); pausedRef.current = false; setPaused(false); setCompleted(false);
    fightersRef.current = profiles.map((profile, index) => makeFighter(profile, index, stockCount));
    collisionHistory.current.clear();
  };

  const viewWidth = camera.width;
  const fighters = fightersRef.current;
  const displayRules = rules;
  const isCountdown = displayRules.phase === 'countdown';
  const visibleTimer = formatMatchTime(displayRules.framesRemaining);
  const showResults = completed || displayRules.phase === 'finished';
  const hasUnapprovedHitboxGeometry = ANIMATION_CATALOG.some((entry) =>
    Boolean(entry.hitboxes?.length) && !APPROVED_ANIMATIONS[entry.id]?.frames.length,
  );
  const leftColor = getColorByIndex(characters[0], fighters[0]?.profile.colorIndex)?.primaryColor ?? '#16c6e7';
  const rightColor = getColorByIndex(characters[0], fighters[1]?.profile.colorIndex)?.primaryColor ?? '#ffbd3e';
  const availablePads = typeof navigator === 'undefined' ? 0 : Array.from(navigator.getGamepads?.() ?? []).filter(Boolean).length;
  let assignedPads = 0;
  const controlsLabels = fighters.map((fighter) => {
    if (fighter.profile.controllerType === 'keyboard') return 'Keyboard';
    assignedPads += 1;
    return assignedPads <= availablePads ? `Controller ${assignedPads}` : 'Keyboard';
  });

  return (
    <main className="local-match-screen">
      <header className="match-hud">
        {[hud[0]].map((player) => player && (
          <section className="match-player-hud player-1" key="p1">
            <strong>{player.name}</strong><span className="hud-damage">{player.percent.toFixed(0)}%</span>
            <span className="stock-icons" aria-label={`${player.stocks} stocks`}>{'● '.repeat(player.stocks)}</span>
          </section>
        ))}
        <div className="match-clock">{displayRules.suddenDeath ? 'SUDDEN DEATH' : displayRules.timeLimitFrames ? visibleTimer : '∞'}</div>
        {[hud[1]].map((player) => player && (
          <section className="match-player-hud player-2" key="p2">
            <strong>{player.name}</strong><span className="hud-damage">{player.percent.toFixed(0)}%</span>
            <span className="stock-icons" aria-label={`${player.stocks} stocks`}>{'● '.repeat(player.stocks)}</span>
          </section>
        ))}
      </header>
      <div className="match-stage-wrap">
        {hasUnapprovedHitboxGeometry && <div className="match-geometry-notice" role="status">
          <strong>Provisional hitbox shapes</strong>
          <span>Damage/frame data: SmashWiki · positions: estimated</span>
        </div>}
        <svg className="match-stage" viewBox={`${camera.x - viewWidth / 2} -75 ${viewWidth} 100`} role="img" aria-label="Omega platform local match">
          <defs>
            <linearGradient id="match-platform" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#354763" /><stop offset="1" stopColor="#101a2b" /></linearGradient>
            <radialGradient id="match-glow"><stop stopColor="#ffd34e" stopOpacity=".6" /><stop offset="1" stopColor="#0b1320" stopOpacity="0" /></radialGradient>
          </defs>
          <rect x={camera.x - viewWidth} y="-75" width={viewWidth * 2} height="100" fill="url(#match-glow)" />
          <path d="M -80 0 H 80 L 25 -34 H -25 Z" fill="url(#match-platform)" stroke="#21d1e9" strokeWidth=".8" />
          {fighters.map((fighter, index) => {
            const x = Number(fighter.movement.positionX); const y = Number(fighter.movement.positionY);
            const color = index === 0 ? leftColor : rightColor;
            return <g key={fighter.profile.id} transform={`translate(${x} ${-y})`} opacity={fighter.invulnerableFrames > 0 && frameCount % 8 < 4 ? .4 : 1}>
              <ellipse cx="0" cy="-1" rx="5" ry="1.4" fill="#000" opacity=".38" />
              <path d="M -3 -2 L -2 -11 L 0 -15 L 3 -10 L 3 -2 Z" fill={color} stroke="#101827" strokeWidth=".55" />
              <circle cx="0" cy="-17" r="2.3" fill="#f2c6a1" stroke="#101827" strokeWidth=".5" />
              <path d="M -2 -19 L 0 -22 L 3 -19 L 1 -18 Z" fill="#e83f4e" />
              <path d="M -2 -2 L -3 0 M 2 -2 L 3 0" stroke="#f2c6a1" strokeWidth="1.2" />
              <text x="0" y="-25" textAnchor="middle" fontSize="3" fill="white" stroke="#0c1420" strokeWidth=".7" paintOrder="stroke">{fighter.profile.name}</text>
            </g>;
          })}
        </svg>
        {isCountdown && <div className="match-overlay countdown">{countdownLabel(displayRules.countdownFrames)}</div>}
        {displayRules.phase === 'paused' && <div className="match-overlay pause-overlay"><strong>PAUSED</strong><button onClick={togglePause}>RESUME</button><button onClick={() => navigate('/')}>QUIT MATCH</button></div>}
        {showResults && <div className="match-overlay results-overlay">
          <span>GAME!</span><h1>{displayRules.winner === null ? 'DRAW' : `${hud[displayRules.winner]?.name ?? 'PLAYER'} WINS`}</h1>
          <div className="results-table"><strong>PLAYER</strong><strong>KOs</strong><strong>FALLS</strong><strong>DAMAGE</strong>
            {hud.map((item, i) => <React.Fragment key={i}><span>{item.name}</span><span>{item.kos}</span><span>{item.falls}</span><span>{item.damageDealt.toFixed(1)}%</span></React.Fragment>)}
          </div>
          <button onClick={restart}>REMATCH</button><button onClick={() => navigate('/')}>RETURN TO MENU</button>
        </div>}
      </div>
      <footer className="match-controls">
        <span>P1: {controlsLabels[0] === 'Keyboard' ? 'WASD + J/K/L' : controlsLabels[0]} · P2: {controlsLabels[1] === 'Keyboard' ? 'Arrows + Numpad' : controlsLabels[1]}</span>
        {!showResults && <button onClick={togglePause}>{paused ? 'RESUME' : 'PAUSE'} · Esc</button>}
        <span className="sr-only">Frame {frameCount}</span>
      </footer>
    </main>
  );
};

export default MatchScreen;
