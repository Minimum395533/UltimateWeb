import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { DEFAULT_KEYBINDS_KEYBOARD_P1 } from '../types';
import type { PlayerKeybinds } from '../types';
import { normalizeControllerSettings } from '../physics/controllerSettings';
import {
  CAPTAIN_FALCON_MOVEMENT,
  TRAINING_SIMULATION_HZ,
  TRAINING_STAGE_HALF_WIDTH,
  TRAINING_STEP_MILLISECONDS,
  createInitialTrainingMovementState,
  stepTrainingMovement,
} from '../physics/trainingMovement';
import type { TrainingMovementState } from '../physics/trainingMovement';
import { readTrainingControlInput } from '../physics/trainingInput';
import type { GamepadSnapshot } from '../physics/trainingInput';
import '../styles/TrainingScreen.css';

const TrainingScreen: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useGameState();
  const player = state.players[0];
  const [movement, setMovement] = useState(createInitialTrainingMovementState);
  const movementRef = useRef<TrainingMovementState>(createInitialTrainingMovementState());
  const pressedKeys = useRef(new Set<string>());
  const bindingsRef = useRef<PlayerKeybinds>(DEFAULT_KEYBINDS_KEYBOARD_P1);
  const controllerSettingsRef = useRef(normalizeControllerSettings(undefined));
  const controllerSettings = useMemo(
    () => normalizeControllerSettings(player?.controllerSettings),
    [player?.controllerSettings],
  );

  useEffect(() => {
    bindingsRef.current = player?.keybinds ?? DEFAULT_KEYBINDS_KEYBOARD_P1;
    controllerSettingsRef.current = controllerSettings;
  }, [player?.keybinds, player?.controllerSettings, controllerSettings]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      pressedKeys.current.add(event.code);
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeys.current.delete(event.code);
    };
    const handleBlur = () => pressedKeys.current.clear();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useEffect(() => {
    let animationFrame = 0;
    let previousTimestamp: number | null = null;
    let accumulatedMilliseconds = 0;

    const animate = (timestamp: number) => {
      if (previousTimestamp !== null) {
        accumulatedMilliseconds += Math.min(timestamp - previousTimestamp, 100);
        let steps = 0;

        while (
          accumulatedMilliseconds >= TRAINING_STEP_MILLISECONDS
          && steps < 6
        ) {
          const gamepads: GamepadSnapshot[] = typeof navigator.getGamepads === 'function'
            ? Array.from(navigator.getGamepads()).filter(
              (gamepad): gamepad is Gamepad => gamepad !== null,
            )
            : [];
          const input = readTrainingControlInput(
            bindingsRef.current,
            pressedKeys.current,
            gamepads,
            controllerSettingsRef.current,
          );
          movementRef.current = stepTrainingMovement(
            movementRef.current,
            input,
            controllerSettingsRef.current,
          );
          accumulatedMilliseconds -= TRAINING_STEP_MILLISECONDS;
          steps += 1;
        }

        if (steps === 6) {
          accumulatedMilliseconds = Math.min(
            accumulatedMilliseconds,
            TRAINING_STEP_MILLISECONDS,
          );
        }
      }

      previousTimestamp = timestamp;
      setMovement({ ...movementRef.current });
      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  const handleBack = () => navigate('/');
  const stageHalfWidth = Number(TRAINING_STAGE_HALF_WIDTH);
  const fighterPositionPercent = Math.max(
    0,
    Math.min(100, ((Number(movement.positionX) + stageHalfWidth) / (2 * stageHalfWidth)) * 100),
  );
  const speed = Math.abs(Number(movement.velocityX));
  const modeLabel = movement.mode === 'walk' && movement.walkBand > 0
    ? `WALK · ${movement.walkBand}`
    : movement.mode.replace('-', ' ').toUpperCase();
  const settingsLabel = controllerSettings.stickJumpEnabled ? 'ON' : 'OFF';

  return (
    <main className="training-screen">
      <div className="background-overlay" />

      <header className="header training-header">
        <button className="back-button" onClick={handleBack}>
          ← BACK
        </button>
        <h1>TRAINING MODE</h1>
        <div className="header-spacer" />
      </header>

      <section className="training-content" aria-label="Movement training prototype">
        <div className="training-summary">
          <div>
            <span className="training-eyebrow">MOVEMENT TEST · P1</span>
            <h2>CAPTAIN FALCON</h2>
          </div>
          <div className="training-frame-rate">
            FIXED STEP <strong>{TRAINING_SIMULATION_HZ} FPS</strong>
            <button
              className="training-settings-button"
              type="button"
              onClick={() => navigate('/settings')}
            >
              Controller settings
            </button>
          </div>
        </div>

        <div className="training-stage" aria-label="Training stage">
          <div className="stage-grid" aria-hidden="true" />
          <div className="stage-axis" aria-hidden="true">
            <span>−{stageHalfWidth} u</span>
            <span>0 u</span>
            <span>+{stageHalfWidth} u</span>
          </div>
          <div className="stage-floor" aria-hidden="true" />
          <div
            className={`training-bean is-${movement.mode}`}
            style={{ left: `${fighterPositionPercent}%` }}
            role="img"
            aria-label="Simple Captain Falcon movement prototype"
          />
        </div>

        <div className="movement-readout" aria-label="Current movement state">
          <div>
            <span>STATE</span>
            <strong>{modeLabel}</strong>
          </div>
          <div>
            <span>SPEED</span>
            <strong>{speed.toFixed(3)} <small>u/frame</small></strong>
          </div>
          <div>
            <span>POSITION</span>
            <strong>{Number(movement.positionX).toFixed(2)} <small>u</small></strong>
          </div>
          <div className={movement.stickJumpAction ? 'jump-status is-active' : 'jump-status'}>
            <span>STICK JUMP</span>
            <strong>{movement.stickJumpAction ? 'JUMP INPUT' : settingsLabel}</strong>
          </div>
        </div>

        <div className="training-instructions">
          <p><strong>Move:</strong> A / D, your rebinds, or the gamepad D-pad or left stick.</p>
          <p><strong>Analog:</strong> light tilt walks at a scaled speed; a quick full flick dashes; holding full tilt runs.</p>
          <p><strong>Captain Falcon data:</strong> walk {Number(CAPTAIN_FALCON_MOVEMENT.walkSpeed).toFixed(3)} · initial dash {Number(CAPTAIN_FALCON_MOVEMENT.initialDashSpeed).toFixed(3)} · run {Number(CAPTAIN_FALCON_MOVEMENT.runSpeed).toFixed(3)} u/frame.</p>
          <p className="training-note">Stick Jump only reports its input here. Jump physics and attacks are not implemented.</p>
        </div>
      </section>
    </main>
  );
};

export default TrainingScreen;
