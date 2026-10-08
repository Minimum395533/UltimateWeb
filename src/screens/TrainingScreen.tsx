import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { DEFAULT_KEYBINDS_KEYBOARD_P1 } from '../types';
import type { PlayerKeybinds } from '../types';
import { normalizeControllerSettings } from '../physics/controllerSettings';
import {
  CAPTAIN_FALCON_MOVEMENT,
  TRAINING_BLASTZONE_BOUNDS,
  TRAINING_CAMERA_LIMITS,
  TRAINING_SIMULATION_HZ,
  TRAINING_STAGE_HALF_WIDTH,
  TRAINING_STAGE_WIDTH,
  TRAINING_STEP_MILLISECONDS,
  createInitialTrainingMovementState,
  getTrainingCameraPosition,
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
  const [cameraFollowEnabled, setCameraFollowEnabled] = useState(true);
  const [stageZoom, setStageZoom] = useState<'blastzone' | 'camera'>('blastzone');
  const movementRef = useRef<TrainingMovementState>(createInitialTrainingMovementState());
  const pressedKeys = useRef(new Set<string>());
  const newlyPressedKeys = useRef(new Set<string>());
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
      if (!pressedKeys.current.has(event.code)) {
        newlyPressedKeys.current.add(event.code);
      }
      pressedKeys.current.add(event.code);
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeys.current.delete(event.code);
    };
    const handleBlur = () => {
      pressedKeys.current.clear();
      newlyPressedKeys.current.clear();
    };

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
            newlyPressedKeys.current,
          );
          movementRef.current = stepTrainingMovement(
            movementRef.current,
            input,
            controllerSettingsRef.current,
          );
          newlyPressedKeys.current.clear();
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
  const fighterWorldX = Number(movement.positionX);
  const blastzoneWidth =
    Number(TRAINING_BLASTZONE_BOUNDS.right) - Number(TRAINING_BLASTZONE_BOUNDS.left);
  const blastzoneHeight =
    Number(TRAINING_BLASTZONE_BOUNDS.top) - Number(TRAINING_BLASTZONE_BOUNDS.bottom);
  const worldToMapX = (worldX: number) => (
    ((worldX - Number(TRAINING_BLASTZONE_BOUNDS.left)) / blastzoneWidth) * 100
  );
  const worldToMapY = (worldY: number) => (
    ((Number(TRAINING_BLASTZONE_BOUNDS.top) - worldY) / blastzoneHeight) * 100
  );
  const cameraPosition = getTrainingCameraPosition(
    movement.positionX,
    movement.positionY,
    cameraFollowEnabled,
  );
  const cameraXPercent = worldToMapX(Number(cameraPosition.positionX));
  const cameraYPercent = worldToMapY(Number(cameraPosition.positionY));
  const stageLeftPercent = worldToMapX(-Number(TRAINING_STAGE_HALF_WIDTH));
  const stageRightPercent = worldToMapX(Number(TRAINING_STAGE_HALF_WIDTH));
  const platformTopPercent = worldToMapY(0);
  const platformBottomPercent = worldToMapY(-40);
  const cameraLeftPercent = worldToMapX(Number(TRAINING_CAMERA_LIMITS.left));
  const cameraRightPercent = worldToMapX(Number(TRAINING_CAMERA_LIMITS.right));
  const cameraTopPercent = worldToMapY(Number(TRAINING_CAMERA_LIMITS.top));
  const cameraBottomPercent = worldToMapY(Number(TRAINING_CAMERA_LIMITS.bottom));
  const cameraBoundsWidth =
    Number(TRAINING_CAMERA_LIMITS.right) - Number(TRAINING_CAMERA_LIMITS.left);
  const cameraBoundsHeight =
    Number(TRAINING_CAMERA_LIMITS.top) - Number(TRAINING_CAMERA_LIMITS.bottom);
  const stageZoomScale = stageZoom === 'camera'
    ? Math.min(blastzoneWidth / cameraBoundsWidth, blastzoneHeight / cameraBoundsHeight) * 0.9
    : 1;
  const cameraCenterPercent = worldToMapY(
    (Number(TRAINING_CAMERA_LIMITS.top) + Number(TRAINING_CAMERA_LIMITS.bottom)) / 2,
  );
  const stageZoomTranslateY =
    stageZoom === 'camera' ? (50 - cameraCenterPercent) * stageZoomScale : 0;
  const fighterPositionPercent = worldToMapX(fighterWorldX);
  const fighterHeightPercent = worldToMapY(Number(movement.positionY));
  const speed = Math.abs(Number(movement.velocityX));
  const verticalSpeed = Math.abs(Number(movement.velocityY));
  const modeLabel = movement.jumpSquatFramesRemaining > 0
    ? `JUMP SQUAT · ${movement.jumpSquatFramesRemaining}`
    : !movement.isGrounded
      ? Number(movement.velocityY) > 0
        ? 'RISING'
        : movement.isFastFalling ? 'FAST FALL' : 'FALLING'
    : movement.mode === 'walk' && movement.walkBand > 0
      ? `WALK · ${movement.walkBand}`
      : movement.mode.replace('-', ' ').toUpperCase();
  const settingsLabel = controllerSettings.stickJumpEnabled ? 'ON' : 'OFF';
  const jumpsRemaining = Math.max(
    0,
    1 + CAPTAIN_FALCON_MOVEMENT.maxAirJumps - movement.jumpsUsed,
  );

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
            <button
              className="training-settings-button"
              type="button"
              aria-pressed={cameraFollowEnabled}
              onClick={() => setCameraFollowEnabled((enabled) => !enabled)}
            >
              Camera follow: {cameraFollowEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <div className="stage-view-controls">
          <span className="stage-view-caption">STAGE VIEW</span>
          <div className="stage-zoom-toggle" role="group" aria-label="Stage map zoom">
            <button
              type="button"
              aria-pressed={stageZoom === 'blastzone'}
              onClick={() => setStageZoom('blastzone')}
            >
              Blastzone
            </button>
            <button
              type="button"
              aria-pressed={stageZoom === 'camera'}
              onClick={() => setStageZoom('camera')}
            >
              Camera limits
            </button>
          </div>
        </div>

        <div
          className={`training-stage is-zoomed-to-${stageZoom}`}
          aria-label={`Training stage map zoomed to ${stageZoom === 'blastzone' ? 'blastzone' : 'camera limits'}`}
        >
          <div
            className="stage-world"
            style={{
              transform: `translateY(${stageZoomTranslateY}%) scale(${stageZoomScale})`,
              transformOrigin: '50% 50%',
            }}
          >
            <div className="stage-grid" aria-hidden="true" />
            <div className="stage-blastzone" aria-hidden="true" />
            <div
              className="stage-camera-limits"
              style={{
                left: `${cameraLeftPercent}%`,
                top: `${cameraTopPercent}%`,
                width: `${cameraRightPercent - cameraLeftPercent}%`,
                height: `${cameraBottomPercent - cameraTopPercent}%`,
              }}
              aria-hidden="true"
            />
            {stageZoom === 'blastzone' && (
              <span
                className="stage-camera-label"
                style={{
                  left: `${cameraLeftPercent}%`,
                  top: `${cameraTopPercent}%`,
                }}
              >
                CAMERA LIMITS
              </span>
            )}
            <div
              className="stage-platform"
              style={{
                left: `${stageLeftPercent}%`,
                width: `${stageRightPercent - stageLeftPercent}%`,
                top: `${platformTopPercent}%`,
                height: `${platformBottomPercent - platformTopPercent}%`,
              }}
              aria-hidden="true"
            />
            <span
              className="stage-platform-label"
              style={{
                top: `${platformTopPercent + (platformBottomPercent - platformTopPercent) * 0.7}%`,
              }}
            >
              OMEGA · {Number(TRAINING_STAGE_WIDTH)} u
            </span>
            <div
              className="stage-camera-marker"
              style={{ left: `${cameraXPercent}%`, top: `${cameraYPercent}%` }}
              aria-hidden="true"
            />
            <div
              className={`training-bean is-${movement.mode}${movement.isGrounded ? '' : ' is-airborne'}${movement.isFastFalling ? ' is-fast-falling' : ''}`}
              style={{
                left: `${fighterPositionPercent}%`,
                top: `${fighterHeightPercent}%`,
              }}
              role="img"
              aria-label="Simple Captain Falcon movement prototype"
            />
          </div>
          <span className="stage-blastzone-label">
            {stageZoom === 'blastzone' ? 'BLASTZONE' : 'CAMERA LIMITS'}
          </span>
          <div className="stage-camera-readout">
            CAMERA {cameraFollowEnabled ? 'FOLLOW' : 'CENTER'}&nbsp; X {Number(cameraPosition.positionX).toFixed(0)} · Y {Number(cameraPosition.positionY).toFixed(0)} u
          </div>
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
            <span>X POSITION</span>
            <strong>{Number(movement.positionX).toFixed(2)} <small>u</small></strong>
          </div>
          <div>
            <span>ALTITUDE</span>
            <strong>{Number(movement.positionY).toFixed(2)} <small>u</small></strong>
          </div>
          <div>
            <span>VERTICAL SPEED</span>
            <strong>{verticalSpeed.toFixed(3)} <small>u/frame</small></strong>
          </div>
          <div className={movement.stickJumpAction ? 'jump-status is-active' : 'jump-status'}>
            <span>STICK JUMP</span>
            <strong>{movement.stickJumpAction ? 'JUMP INPUT' : settingsLabel}</strong>
          </div>
          <div>
            <span>JUMPS LEFT</span>
            <strong>{jumpsRemaining}</strong>
          </div>
        </div>

        <div className="training-instructions">
          <p><strong>Move:</strong> A / D, your rebinds, or the gamepad D-pad or left stick.</p>
          <p><strong>Analog:</strong> light tilt walks at a scaled speed; a quick full flick dashes; holding full tilt runs.</p>
          <p><strong>Jump:</strong> J / Space, your jump rebinds, or enabled Stick Jump. Hold through the 3-frame squat for a full hop; release during it for a short hop. Press jump again in the air for Falcon’s midair jump.</p>
          <p><strong>Camera:</strong> toggle follow on to track the fighter within the inner camera limits; turn it off to keep the camera at stage center.</p>
          <p><strong>Stage view:</strong> use Blastzone to see the full field or Camera limits to zoom into the inner bounds.</p>
          <p><strong>Fall:</strong> walk or run off either ledge. Hold your down binding (S by default) or tilt the stick down while falling to fast-fall.</p>
          <p><strong>Omega platform:</strong> {Number(TRAINING_STAGE_WIDTH)} u wide, with open ledges at ±{Number(TRAINING_STAGE_HALF_WIDTH)} u.</p>
          <p><strong>Captain Falcon:</strong> gravity {Number(CAPTAIN_FALCON_MOVEMENT.gravity).toFixed(2)} u/frame² · walk {Number(CAPTAIN_FALCON_MOVEMENT.walkSpeed).toFixed(3)} · initial dash {Number(CAPTAIN_FALCON_MOVEMENT.initialDashSpeed).toFixed(3)} · run {Number(CAPTAIN_FALCON_MOVEMENT.runSpeed).toFixed(3)} · fall {Number(CAPTAIN_FALCON_MOVEMENT.fallSpeed).toFixed(3)} · fast fall {Number(CAPTAIN_FALCON_MOVEMENT.fastFallSpeed).toFixed(3)} u/frame.</p>
          <p><strong>Jump heights:</strong> full hop {Number(CAPTAIN_FALCON_MOVEMENT.fullHopHeight)} u · first-four-frame height {Number(CAPTAIN_FALCON_MOVEMENT.jumpInitialHeight)} u · short hop {Number(CAPTAIN_FALCON_MOVEMENT.shortHopHeight)} u · one midair jump {Number(CAPTAIN_FALCON_MOVEMENT.airJumpHeight)} u.</p>
          <p><strong>Diagram-scaled bounds:</strong> blastzone x ±240, y −140 to +179 u · camera x ±180, y −60 to +130 u. These bounds are approximate and scaled from the supplied image.</p>
          <p className="training-note">A jump off the platform keeps one midair jump available. Landing restores both jumps; attacks and other combat actions are not implemented.</p>
        </div>
      </section>
    </main>
  );
};

export default TrainingScreen;
