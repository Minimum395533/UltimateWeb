import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { DEFAULT_KEYBINDS_KEYBOARD_P1 } from '../types';
import type { PlayerButtonSettings, PlayerKeybinds } from '../types';
import type { AnimationDraft } from '../types/frameData';
import type { AnimationFrame } from '../types/frameData';
import { getSmashFlickWindowFrames, normalizeControllerSettings } from '../physics/controllerSettings';
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
import {
  INITIAL_MOVEMENT_ANIMATION_PREVIEW,
  stepMovementAnimationPreview,
} from '../dev/animationPreview';
import type { AnimationClipSource, MovementAnimationPreviewFrame } from '../dev/animationPreview';
import type { TrainingClips } from '../data/falcon/trainingClips';
import { capsulesOverlap, defaultTrainingHurtboxes, resolveHitboxCollisions } from '../physics/hitboxCollision';
import type { CollisionHistory, CombatantFrame } from '../physics/hitboxCollision';
import type { AnimationClip } from '../dev/animationPreview';
import { applyDirectionalInfluence, applyReaction, calculateHitReaction, CAPTAIN_FALCON_WEIGHT, staleQueueAfterMove, stepLaunch } from '../physics/combat';
import type { CombatantRuntime, HitReaction } from '../physics/combat';
import { chooseGetup } from '../physics/combat';
import { applyShieldHit, createShieldState, dodgeIsIntangible, dodgeLandingLagFrames, dodgeTiming, dropShield, grabHoldFrames, mashGrabEscape, outOfShieldLag, stepShield } from '../physics/defense';
import type { ShieldState } from '../physics/defense';
import { canChooseLedgeOption, chooseLedgeOption, createLedgeRecoveryState, detectLedgeGrab, grabLedge, ledgeHangLimit, LEDGE_ANIMATION_IDS, ledgeOptionIntangible, snapLedgePosition, stepLedge } from '../physics/ledgeRecovery';
import type { LedgeOption, LedgeRecoveryState } from '../physics/ledgeRecovery';
import { unitsPerFrame, worldUnits } from '../physics/units';
import type { RecoveryState } from '../physics/combat';
import { classifyNormalAttack, getJabFollowup, getNormalAttackData, getSmashChargeDamageMultiplier, NORMAL_ATTACK_IDS, scaleAttackHitboxes } from '../physics/normalAttacks';
import type { NormalAttackId } from '../physics/normalAttacks';
import '../styles/TrainingScreen.css';

const TrainingScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state } = useGameState();
  const player = state.players[0];
  const requestedPreviewId = import.meta.env.DEV
    ? searchParams.get('previewDraft')
    : null;
  const [movement, setMovement] = useState(createInitialTrainingMovementState);
  const [cameraFollowEnabled, setCameraFollowEnabled] = useState(true);
  const [stageZoom, setStageZoom] = useState<'blastzone' | 'camera'>('blastzone');
  const [previewDraft, setPreviewDraft] = useState<AnimationDraft | null>(null);
  const [clips, setClips] = useState<TrainingClips>({});
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [animationPreview, setAnimationPreview] =
    useState<MovementAnimationPreviewFrame | null>(null);
  const [showCollisionShapes, setShowCollisionShapes] = useState(false);
  const [hitReadout, setHitReadout] = useState('No hits registered');
  const [jabTestActive, setJabTestActive] = useState(false);
  const [selectedAttack, setSelectedAttack] = useState<NormalAttackId>('jab-1');
  const [attackFramePreview, setAttackFramePreview] = useState<AnimationFrame | null>(null);
  const [dummyPercent, setDummyPercent] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [lastReaction, setLastReaction] = useState<HitReaction | null>(null);
  const [dummyGrabbed, setDummyGrabbed] = useState(false);
  const [dummyBehavior, setDummyBehavior] = useState<'stand' | 'jump' | 'move' | 'shield' | 'parry' | 'dodge' | 'roll-forward' | 'roll-back' | 'air-dodge' | 'air-dodge-directional' | 'mash'>('stand');
  const [dummyFrame, setDummyFrame] = useState(0);
  const [simSpeed, setSimSpeed] = useState(1);
  const [dummyRecovery, setDummyRecovery] = useState<RecoveryState>('airborne');
  const [getupOption, setGetupOption] = useState<'neutral' | 'roll-left' | 'roll-right' | 'attack'>('neutral');
  const dummyPercentRef = useRef(0);
  const dummyBehaviorRef = useRef<'stand' | 'jump' | 'move' | 'shield' | 'parry' | 'dodge' | 'roll-forward' | 'roll-back' | 'air-dodge' | 'air-dodge-directional' | 'mash'>('stand');
  const dummyShieldRef = useRef<ShieldState>(createShieldState());
  const [dummyShieldHealth, setDummyShieldHealth] = useState(50);
  const [dummyDodgeLandingLag, setDummyDodgeLandingLag] = useState(0);
  const [ledgeReadout, setLedgeReadout] = useState('No ledge grab');
  const ledgeStateRef = useRef<LedgeRecoveryState>(createLedgeRecoveryState());
  const [ledgePercent, setLedgePercent] = useState(0);
  const ledgePercentRef = useRef(0);
  const dummyGrabbedRef = useRef(false);
  const grabHoldFramesRef = useRef(0);
  const dummyDodgeLandingLagRef = useRef(0);
  const wasAirDodgeIntangibleRef = useRef(false);
  const dummyFrameRef = useRef(0);
  const simSpeedRef = useRef(1);
  const manualStepsRef = useRef(0);
  const dummyLaunchedRef = useRef(false);
  const dummyInvincibleFramesRef = useRef(0);
  const dummyRespawnFramesRef = useRef(0);
  const dummyTechWindowRef = useRef(0);
  const playerHitlagFramesRef = useRef(0);
  const lastReactionRef = useRef<HitReaction | null>(null);
  const dummyRuntimeRef = useRef<CombatantRuntime>({
    percent: 0, positionX: 16, positionY: 0, velocityX: 0, velocityY: 0,
    hitlagFrames: 0, hitstunFrames: 0, ko: false,
  });
  const staleQueueRef = useRef<string[]>([]);
  const movementRef = useRef<TrainingMovementState>(createInitialTrainingMovementState());
  const clipsRef = useRef<TrainingClips>({});
  const previewPlaybackRef = useRef(INITIAL_MOVEMENT_ANIMATION_PREVIEW);
  const activeAnimationRef = useRef<MovementAnimationPreviewFrame | null>(null);
  const attackTestRef = useRef<{ clip: AnimationClip; frameIndex: number; moveId: string; damageMultiplier: number } | null>(null);
  const previousAttackActionsRef = useRef({ attack: false, tilt: false, smash: false, rightStick: false, grab: false });
  const previousStickMagnitudeRef = useRef(0);
  const stickFlickAgeRef = useRef(99);
  const bufferedAttackRef = useRef<{ id: NormalAttackId; expires: number } | null>(null);
  const lastJabRef = useRef<NormalAttackId | null>(null);
  const smashChargeRef = useRef<{ id: NormalAttackId; frames: number } | null>(null);
  const pendingDamageMultiplierRef = useRef(1);
  const shortHopWindowRef = useRef(0);
  const landingLagRef = useRef(0);
  const collisionHistoryRef = useRef(new Map<string, CollisionHistory>());
  const forceIdleVarianceRef = useRef(false);
  const pressedKeys = useRef(new Set<string>());
  const newlyPressedKeys = useRef(new Set<string>());
  const bindingsRef = useRef<PlayerKeybinds>(DEFAULT_KEYBINDS_KEYBOARD_P1);
  const buttonSettingsRef = useRef<PlayerButtonSettings | undefined>(undefined);
  const controllerTypeRef = useRef(player?.controllerType ?? 'pro');
  const controllerSettingsRef = useRef(normalizeControllerSettings(undefined));
  const controllerSettings = useMemo(
    () => normalizeControllerSettings(player?.controllerSettings),
    [player?.controllerSettings],
  );

  useEffect(() => {
    bindingsRef.current = player?.keybinds ?? DEFAULT_KEYBINDS_KEYBOARD_P1;
    controllerSettingsRef.current = controllerSettings;
    buttonSettingsRef.current = player?.buttonSettings;
    controllerTypeRef.current = player?.controllerType ?? 'pro';
  }, [player?.keybinds, player?.controllerSettings, controllerSettings]);

  useEffect(() => {
    clipsRef.current = {};
    setClips({});
    setPreviewDraft(null);
    setPreviewError(null);
    setAnimationPreview(null);
    previewPlaybackRef.current = INITIAL_MOVEMENT_ANIMATION_PREVIEW;
    activeAnimationRef.current = null;
    forceIdleVarianceRef.current = false;

    let cancelled = false;
    const applyClips = (nextClips: TrainingClips) => {
      clipsRef.current = nextClips;
      previewPlaybackRef.current = INITIAL_MOVEMENT_ANIMATION_PREVIEW;
      setClips(nextClips);
    };
    const clipModule = import('../data/falcon/trainingClips');

    // Normal training: approved animations, falling back to labeled defaults.
    if (!import.meta.env.DEV || !requestedPreviewId) {
      setPreviewLoading(false);
      void clipModule.then(({ buildTrainingClips }) => {
        if (!cancelled) applyClips(buildTrainingClips());
      });
      return () => {
        cancelled = true;
      };
    }

    // Draft playtest: working drafts override approved and default clips.
    setPreviewLoading(true);
    void Promise.all([
      clipModule,
      import('../dev/frameDataClient').then(({ listAnimationDrafts }) => listAnimationDrafts()),
    ])
      .then(([{ buildTrainingClips }, drafts]) => {
        if (cancelled) return;
        const selectedDraft = drafts.find(({ id }) => id === requestedPreviewId);
        if (!selectedDraft) {
          throw new Error('This draft no longer exists. Reopen it from the frame-data editor.');
        }
        applyClips(buildTrainingClips(drafts));
        setPreviewDraft(selectedDraft);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setPreviewError(
          loadError instanceof Error
            ? loadError.message
            : 'Could not load saved animation drafts.',
        );
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [requestedPreviewId]);

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
        accumulatedMilliseconds += Math.min(timestamp - previousTimestamp, 100) * simSpeedRef.current;
        let steps = 0;

        while (
          (accumulatedMilliseconds >= TRAINING_STEP_MILLISECONDS || manualStepsRef.current > 0)
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
            buttonSettingsRef.current,
            controllerTypeRef.current,
          );
          const actions = previousAttackActionsRef.current;
          const rightStickHeld = Math.abs(input.rightStickX) > 0.65 || Math.abs(input.rightStickY) > 0.65;
          const rightStickPressed = rightStickHeld && !actions.rightStick;
          const grabPressed = input.actions.grab && !actions.grab;
          const magnitude = Math.max(Math.abs(input.horizontal), Math.abs(input.vertical));
          if (magnitude > 0.25) {
            stickFlickAgeRef.current = previousStickMagnitudeRef.current <= 0.25
              ? 0 : stickFlickAgeRef.current + 1;
          } else stickFlickAgeRef.current = 99;
          const flickKind = Math.abs(input.vertical) > Math.abs(input.horizontal) ? 'vertical-smash' : 'forward-smash';
          const flick = magnitude > 0.9 && previousStickMagnitudeRef.current <= 0.65
            && stickFlickAgeRef.current <= getSmashFlickWindowFrames(controllerSettingsRef.current, flickKind);
          const attackPressed = input.actions.attack && !actions.attack;
          const tiltPressed = input.actions.tilt && !actions.tilt;
          const smashPressed = input.actions.smash && !actions.smash;
          const command = classifyNormalAttack({
            attackPressed, tiltPressed, smashPressed,
            horizontal: input.horizontal * movementRef.current.facingDirection, vertical: input.vertical,
            rightX: input.rightStickX * movementRef.current.facingDirection, rightY: input.rightStickY,
            airborne: !movementRef.current.isGrounded,
            dashAttack: attackPressed && (movementRef.current.mode === 'run' || movementRef.current.mode === 'initial-dash'),
            stickMode: controllerSettingsRef.current.rightStickMode ?? 'smash',
            flick,
          });
          const selectedCommand = rightStickPressed && !command
            ? classifyNormalAttack({
              attackPressed: true, tiltPressed: false, smashPressed: false,
              horizontal: input.horizontal * movementRef.current.facingDirection, vertical: input.vertical,
              rightX: input.rightStickX * movementRef.current.facingDirection, rightY: input.rightStickY,
              airborne: !movementRef.current.isGrounded, dashAttack: false,
              stickMode: controllerSettingsRef.current.rightStickMode ?? 'smash', flick: false,
            })
            : command;
          previousAttackActionsRef.current = { attack: input.actions.attack, tilt: input.actions.tilt, smash: input.actions.smash, rightStick: rightStickHeld, grab: input.actions.grab };
          previousStickMagnitudeRef.current = magnitude;
          const buffered = bufferedAttackRef.current;
          if (buffered && buffered.expires <= 0) bufferedAttackRef.current = null;
          else if (buffered) buffered.expires -= 1;
          let requestedAttack = selectedCommand;
          if (smashPressed && selectedCommand) smashChargeRef.current = { id: selectedCommand, frames: 0 };
          if (input.actions.smash && smashChargeRef.current) {
            smashChargeRef.current.frames = Math.min(60, smashChargeRef.current.frames + 1);
            requestedAttack = null;
          } else if (actions.smash && !input.actions.smash && smashChargeRef.current) {
            requestedAttack = smashChargeRef.current.id;
            pendingDamageMultiplierRef.current = getSmashChargeDamageMultiplier(smashChargeRef.current.frames);
            smashChargeRef.current = null;
          }
          if (requestedAttack === 'jab-1' && attackPressed && lastJabRef.current) {
            requestedAttack = getJabFollowup(lastJabRef.current, input.actions.attack) ?? 'jab-1';
          }
          if (landingLagRef.current > 0) {
            landingLagRef.current -= 1;
            requestedAttack = null;
          }
          const currentAttack = attackTestRef.current;
           const currentAttackData = currentAttack && NORMAL_ATTACK_IDS.includes(currentAttack.moveId as NormalAttackId)
             ? getNormalAttackData(currentAttack.moveId as NormalAttackId) : null;
          const jabCancel = currentAttack && requestedAttack?.startsWith('jab-')
            && (currentAttack.moveId === 'jab-1' || currentAttack.moveId === 'jab-2')
            && currentAttack.frameIndex + 1 >= (currentAttackData?.activeFrames.at(-1) ?? Infinity);
          const mayInterrupt = !currentAttack || jabCancel
            || currentAttack.frameIndex + 1 >= (currentAttackData?.firstActionableFrame ?? Infinity);
           const remainingToActionable = currentAttack && currentAttackData
             ? currentAttackData.firstActionableFrame - (currentAttack.frameIndex + 1)
            : 0;
          if (requestedAttack && !mayInterrupt && remainingToActionable <= 9) bufferedAttackRef.current = { id: requestedAttack, expires: 9 };
          const launchAttack = landingLagRef.current > 0 ? null : mayInterrupt ? (requestedAttack ?? bufferedAttackRef.current?.id ?? null) : null;
          if (launchAttack) {
            bufferedAttackRef.current = null;
            if (launchAttack.startsWith('jab')) lastJabRef.current = launchAttack;
            const isAerial = ['nair', 'fair', 'bair', 'uair', 'dair'].includes(launchAttack);
            pendingDamageMultiplierRef.current *= isAerial && shortHopWindowRef.current > 0 ? 0.85 : 1;
            void import('../data/falcon/trainingClips').then(({ resolveAnimationClip }) => {
              const clip = resolveAnimationClip(launchAttack);
              if (!clip) return;
              collisionHistoryRef.current.clear();
              attackTestRef.current = { clip, frameIndex: -1, moveId: clip.animationId, damageMultiplier: pendingDamageMultiplierRef.current };
              pendingDamageMultiplierRef.current = 1;
              setHitReadout(`${getNormalAttackData(launchAttack).label} · ${clip.source === 'default' ? 'DEFAULT SHAPES · NOT APPROVED' : clip.source === 'approved' ? 'APPROVED DATA' : 'DRAFT'} · target at 16 u`);
              setJabTestActive(true);
            });
          }
          if (grabPressed && !dummyGrabbedRef.current && !attackTestRef.current) {
            void import('../data/falcon/trainingClips').then(({ resolveAnimationClip }) => {
              const grabMove = movementRef.current.mode === 'run' || movementRef.current.mode === 'initial-dash'
                ? 'dash-grab'
                : movementRef.current.mode === 'turnaround-dash' ? 'pivot-grab' : 'grab';
              const clip = resolveAnimationClip(grabMove);
              if (!clip) return;
              collisionHistoryRef.current.clear();
              attackTestRef.current = { clip, frameIndex: -1, moveId: grabMove, damageMultiplier: 1 };
              setHitReadout(`${clip.animationId} · SmashWiki grabbox timing`);
              setJabTestActive(true);
            });
          }
          const playerInHitlag = playerHitlagFramesRef.current > 0;
          if (playerInHitlag) playerHitlagFramesRef.current -= 1;
          else if ((!attackTestRef.current || !movementRef.current.isGrounded) && landingLagRef.current === 0 && !ledgeStateRef.current.side) {
            const wasGrounded = movementRef.current.isGrounded;
            movementRef.current = stepTrainingMovement(movementRef.current, input, controllerSettingsRef.current);
            if (movementRef.current.isGrounded) {
              if (ledgeStateRef.current.grabCount) ledgeStateRef.current = createLedgeRecoveryState();
            } else {
              const falling = { ...ledgeStateRef.current, airtimeFrames: ledgeStateRef.current.airtimeFrames + 1 };
              ledgeStateRef.current = falling;
              const side = detectLedgeGrab(Number(movementRef.current.positionX), Number(movementRef.current.positionY), Number(movementRef.current.velocityY), true);
              if (side !== null) {
                const grabbed = grabLedge(falling, side, falling.airtimeFrames, ledgePercentRef.current);
                if (grabbed) {
                  ledgeStateRef.current = grabbed;
                  movementRef.current = { ...movementRef.current, positionX: snapLedgePosition(side), positionY: worldUnits(0), velocityX: unitsPerFrame(0), velocityY: unitsPerFrame(0), facingDirection: side === 1 ? -1 : 1 };
                  setLedgeReadout(`Hanging ${side > 0 ? 'right' : 'left'} · ${grabbed.intangibilityFrames}f grab intangibility`);
                  void import('../data/falcon/trainingClips').then(({ resolveAnimationClip }) => {
                    const clip = resolveAnimationClip('ledge-catch');
                    if (clip) { attackTestRef.current = { clip, frameIndex: -1, moveId: 'ledge-catch', damageMultiplier: 1 }; setJabTestActive(true); }
                  });
                }
              }
            }
            if (wasGrounded && !movementRef.current.isGrounded && movementRef.current.jumpInitialFramesRemaining === 0) shortHopWindowRef.current = 7;
            if (shortHopWindowRef.current > 0) shortHopWindowRef.current -= 1;
            if (!wasGrounded && movementRef.current.isGrounded && attackTestRef.current) {
              const aerialData = getNormalAttackData(attackTestRef.current.moveId as NormalAttackId);
              if (['nair', 'fair', 'bair', 'uair', 'dair'].includes(aerialData.id)) {
                const autoCancelled = aerialData.autoCancelFrames.includes(attackTestRef.current.frameIndex + 1);
                if (!autoCancelled) {
                landingLagRef.current = aerialData.landingLag;
                }
                attackTestRef.current = null;
                setJabTestActive(false);
                setAttackFramePreview(null);
              }
            }
          }
          if (ledgeStateRef.current.side !== null) {
            let option: LedgeOption | null = null;
            if (canChooseLedgeOption(ledgeStateRef.current)) {
              if (input.jumpPressed) option = 'jump';
              else if (attackPressed) option = 'attack';
              else if (input.actions.shield) option = 'roll';
              else if (input.vertical > 0.65) option = 'getup';
              else if (input.vertical < -0.65 || grabPressed || input.horizontal * ledgeStateRef.current.side > 0.75) option = 'drop';
            }
            const before = ledgeStateRef.current.option;
            if (option) ledgeStateRef.current = chooseLedgeOption(ledgeStateRef.current, option);
            const current = ledgeStateRef.current;
            if (current.option && current.optionFrame === 0 && !before) {
              const id = LEDGE_ANIMATION_IDS[current.option];
              void import('../data/falcon/trainingClips').then(({ resolveAnimationClip }) => {
                const clip = resolveAnimationClip(id);
                if (clip) {
                  attackTestRef.current = { clip, frameIndex: -1, moveId: id, damageMultiplier: 1 };
                  setJabTestActive(true);
                }
              });
            }
            const next = stepLedge(current);
            if (current.option && next.side === null) {
              const side = current.side!;
              const action = current.option;
              const offset = action === 'roll' ? 14 : 4;
              movementRef.current = {
                ...movementRef.current,
                positionX: (Number(snapLedgePosition(side)) + side * (action === 'drop' ? 9 : -offset)) as typeof movementRef.current.positionX,
                positionY: action === 'jump' || action === 'drop' ? worldUnits(-1) : worldUnits(0),
                velocityY: unitsPerFrame(action === 'jump' ? 4 : action === 'drop' ? -1 : 0),
                velocityX: unitsPerFrame(0),
                isGrounded: action !== 'jump' && action !== 'drop',
                jumpsUsed: action === 'jump' ? 1 : movementRef.current.jumpsUsed,
              };
              attackTestRef.current = null;
              setJabTestActive(false);
              setLedgeReadout(`${action} complete · regrabs ${current.grabCount}/6`);
            } else if (next.option === null && next.hangFrames >= ledgeHangLimit(ledgePercentRef.current)) {
              const side = next.side!;
              movementRef.current = { ...movementRef.current, positionX: (Number(snapLedgePosition(side)) + side * 9) as typeof movementRef.current.positionX, positionY: worldUnits(-1), velocityY: unitsPerFrame(-1) };
              ledgeStateRef.current = { ...createLedgeRecoveryState(), grabCount: next.grabCount, airtimeFrames: next.airtimeFrames };
              setLedgeReadout('Hang limit reached · dropped');
            } else {
              ledgeStateRef.current = next;
              const intangible = ledgeOptionIntangible(next);
              setLedgeReadout(next.option
                ? `${next.option} · frame ${next.optionFrame}${intangible ? ' · intangible' : ''}`
                : `Hanging ${(next.side ?? current.side!) > 0 ? 'right' : 'left'} · ${next.intangibilityFrames}f intangibility`);
            }
          }
          dummyFrameRef.current += 1;
          setDummyFrame(dummyFrameRef.current);
          if (dummyGrabbedRef.current) {
            const mash = dummyBehaviorRef.current === 'mash' || input.actions.attack || input.actions.jump;
            grabHoldFramesRef.current = mash
              ? mashGrabEscape(grabHoldFramesRef.current, dummyBehaviorRef.current === 'mash' ? 3 : 1)
              : Math.max(0, grabHoldFramesRef.current - 1);
            if (grabHoldFramesRef.current === 0) {
              dummyGrabbedRef.current = false;
              setDummyGrabbed(false);
              setHitReadout('Grab escaped');
            }
          }
          const phase = dummyFrameRef.current;
          const behavior = dummyBehaviorRef.current;
          const parryHolding = behavior === 'parry' && phase % 60 < 9;
          let shield = dummyShieldRef.current;
          if (shield.heldFrames > 0 && behavior !== 'shield' && !parryHolding) shield = dropShield(shield);
          shield = stepShield(shield, behavior === 'shield' || parryHolding);
          dummyShieldRef.current = shield;
          setDummyShieldHealth(shield.health);
          if (manualStepsRef.current > 0) {
            manualStepsRef.current -= 1;
            if (accumulatedMilliseconds >= TRAINING_STEP_MILLISECONDS) accumulatedMilliseconds -= TRAINING_STEP_MILLISECONDS;
          } else accumulatedMilliseconds -= TRAINING_STEP_MILLISECONDS;
          if (dummyLaunchedRef.current && !dummyRuntimeRef.current.ko) {
            if (dummyRuntimeRef.current.hitlagFrames > 0) {
              const sdi = applyDirectionalInfluence(0, {
                sdiX: input.horizontal,
                sdiY: input.downHeld ? -1 : input.stickJumpAction ? 1 : 0,
              }).sdi;
              dummyRuntimeRef.current.positionX += sdi.x;
              dummyRuntimeRef.current.positionY += sdi.y;
            }
            const previousY = dummyRuntimeRef.current.positionY;
            const nextRuntime = stepLaunch(dummyRuntimeRef.current);
            if (previousY >= 0 && nextRuntime.positionY <= 0 && nextRuntime.velocityY < 0) {
              dummyRuntimeRef.current = { ...nextRuntime, positionY: 0, velocityX: 0, velocityY: 0 };
              dummyLaunchedRef.current = false;
              if (lastReactionRef.current?.tumble) {
                dummyTechWindowRef.current = 11;
                setDummyRecovery('knockdown');
              }
              else setDummyRecovery('airborne');
            } else dummyRuntimeRef.current = nextRuntime;
          } else if (dummyRuntimeRef.current.ko) {
            dummyRespawnFramesRef.current += 1;
            if (dummyRespawnFramesRef.current >= 90) {
              dummyRuntimeRef.current = { ...dummyRuntimeRef.current, positionX: 16, positionY: 0, velocityX: 0, velocityY: 0, hitlagFrames: 0, hitstunFrames: 0, ko: false };
              dummyLaunchedRef.current = false;
              dummyRespawnFramesRef.current = 0;
              dummyInvincibleFramesRef.current = 60;
              setDummyRecovery('airborne');
            }
          }
          if (dummyTechWindowRef.current > 0) {
            if (input.actions.shield) {
              dummyTechWindowRef.current = 0;
              setDummyRecovery('ground-tech');
            } else {
              dummyTechWindowRef.current -= 1;
              if (dummyTechWindowRef.current === 0) setDummyRecovery('missed-tech');
            }
          }
          if (dummyInvincibleFramesRef.current > 0) dummyInvincibleFramesRef.current -= 1;
          if (!playerInHitlag) {
            const previewStep = stepMovementAnimationPreview(
              previewPlaybackRef.current,
              movementRef.current,
              clipsRef.current,
              Math.random,
              forceIdleVarianceRef.current,
            );
            previewPlaybackRef.current = previewStep.playback;
            activeAnimationRef.current = previewStep.animation;
          }
          const test = attackTestRef.current;
          if (test && !playerInHitlag) {
            const nextFrame = test.frameIndex + 1;
            if (nextFrame >= test.clip.frames.length) {
              if (test.moveId === 'rapid-jab' && input.actions.attack) {
                test.frameIndex = -1;
              } else if (test.moveId === 'rapid-jab') {
                void import('../data/falcon/trainingClips').then(({ resolveAnimationClip }) => {
                  const finisher = resolveAnimationClip('rapid-jab-finisher');
                  if (finisher) attackTestRef.current = { clip: finisher, frameIndex: -1, moveId: finisher.animationId, damageMultiplier: 1 };
                });
              } else {
                attackTestRef.current = null;
                setJabTestActive(false);
                setAttackFramePreview(null);
              }
            } else {
              test.frameIndex = nextFrame;
              const frame = test.clip.frames[nextFrame];
              setAttackFramePreview(frame);
              const attacker: CombatantFrame = {
                id: 'player-1', moveId: test.moveId, frame: nextFrame + 1,
                position: { x: Number(movementRef.current.positionX), y: Number(movementRef.current.positionY), z: 0 },
                facing: movementRef.current.facingDirection, grounded: movementRef.current.isGrounded,
                hitboxes: scaleAttackHitboxes(frame.hitboxes, test.damageMultiplier),
                hurtboxes: frame.hurtboxes.length ? frame.hurtboxes : defaultTrainingHurtboxes(),
              };
              const phase = dummyFrameRef.current;
              const behaviorPosition = dummyBehaviorRef.current === 'jump'
                ? { x: 16, y: Math.max(0, Math.sin(phase * Math.PI / 45) * 18), z: 0 }
                : dummyBehaviorRef.current === 'move'
                  ? { x: 16 + Math.sin(phase * Math.PI / 60) * 12, y: 0, z: 0 }
                  : { x: 16, y: 0, z: 0 };
              const dodgeIds: Record<string, string> = {
                dodge: 'spot-dodge', 'roll-forward': 'roll-forward', 'roll-back': 'roll-back',
                'air-dodge': 'air-dodge', 'air-dodge-directional': 'air-dodge-directional',
              };
              const dodgeId = dodgeIds[behavior];
              const timing = dodgeId ? dodgeTiming(dodgeId) : null;
              const dodgeFrame = timing ? phase % timing.totalFrames + 1 : 0;
              const dodgeStaleCount = timing ? Math.floor(phase / (timing.totalFrames + 60)) : 0;
              const dodging = Boolean(dodgeId && dodgeIsIntangible(dodgeId, dodgeFrame, dodgeStaleCount));
              const isAirDodge = behavior === 'air-dodge' || behavior === 'air-dodge-directional';
              if (isAirDodge && wasAirDodgeIntangibleRef.current && !dodging) {
                dummyDodgeLandingLagRef.current = dodgeLandingLagFrames(dodgeId ?? '');
              } else if (dummyDodgeLandingLagRef.current > 0) {
                dummyDodgeLandingLagRef.current -= 1;
              }
              wasAirDodgeIntangibleRef.current = isAirDodge && dodging;
              setDummyDodgeLandingLag(dummyDodgeLandingLagRef.current);
              if (behavior === 'roll-forward' || behavior === 'roll-back') {
                const progress = (dodgeFrame || 1) / (timing?.totalFrames ?? 30);
                behaviorPosition.x = 16 + (behavior === 'roll-forward' ? 1 : -1) * progress * 10;
              }
              if (behavior === 'air-dodge' || behavior === 'air-dodge-directional') {
                behaviorPosition.y = dodging ? 8 : 0;
              }
              const targetPosition = dummyGrabbedRef.current
                ? { x: movementRef.current.positionX + movementRef.current.facingDirection * 2, y: movementRef.current.positionY, z: 0 }
                : dummyLaunchedRef.current
                ? { x: dummyRuntimeRef.current.positionX, y: dummyRuntimeRef.current.positionY, z: 0 }
                : behaviorPosition;
              const target: CombatantFrame = {
                id: 'training-target', moveId: 'stationary', frame: nextFrame + 1,
                position: targetPosition, facing: -1, grounded: targetPosition.y === 0,
                hitboxes: [], hurtboxes: defaultTrainingHurtboxes().map((box) => ({
                  ...box, state: dummyInvincibleFramesRef.current > 0 ? 'invincible' : dodging ? 'intangible' : box.state,
                })),
              };
              const grabMove = ['grab', 'dash-grab', 'pivot-grab'].includes(test.moveId);
              const grabHit = grabMove && !dodging && dummyInvincibleFramesRef.current <= 0
                && frame.grabboxes.some((grabbox) =>
                target.hurtboxes.some((hurtbox) => capsulesOverlap(grabbox, attacker, hurtbox, target)),
              );
              if (grabHit && !dummyGrabbedRef.current) {
                dummyGrabbedRef.current = true;
                grabHoldFramesRef.current = grabHoldFrames(dummyPercentRef.current);
                setDummyGrabbed(true);
                setHitReadout(`Grabbed · ${grabHoldFramesRef.current}f to escape · mash to break free`);
              }
              const collision = resolveHitboxCollisions([attacker, target], collisionHistoryRef.current);
              const hit = collision.hits[0];
              if (hit) {
                if (hit.effect === 'hit') {
                  if (behavior === 'shield' || behavior === 'parry') {
                    const blocked = applyShieldHit(shield, hit.hitbox);
                    dummyShieldRef.current = blocked.state;
                    setDummyShieldHealth(blocked.state.health);
                    movementRef.current = {
                      ...movementRef.current,
                      positionX: (Number(movementRef.current.positionX) - movementRef.current.facingDirection * blocked.pushback) as typeof movementRef.current.positionX,
                    };
                    setHitReadout(blocked.parried
                      ? 'Perfect shield · no shield damage or stun'
                      : blocked.broke
                        ? 'Shield break · 37.5f dizzy'
                        : `Shielded · −${blocked.shieldDamage.toFixed(1)} shield · ${blocked.shieldstunFrames}f stun`);
                  } else {
                  const reaction = calculateHitReaction(hit.hitbox, {
                    percent: dummyPercentRef.current,
                    weight: CAPTAIN_FALCON_WEIGHT,
                    staleQueue: staleQueueRef.current,
                    crouching: false,
                    grounded: targetPosition.y === 0,
                  }, hit.moveId);
                  dummyPercentRef.current += reaction.damage;
                  staleQueueRef.current = staleQueueAfterMove(staleQueueRef.current, hit.moveId);
                  dummyRuntimeRef.current = applyReaction({
                    ...dummyRuntimeRef.current, percent: dummyPercentRef.current,
                  }, reaction, movementRef.current.facingDirection, {
                    diX: input.horizontal,
                    diY: input.downHeld ? -1 : input.stickJumpAction ? 1 : 0,
                    lsi: input.downHeld ? -1 : input.stickJumpAction ? 1 : 0,
                  });
                  playerHitlagFramesRef.current = reaction.hitlagFrames;
                  dummyLaunchedRef.current = true;
                  if (dummyGrabbedRef.current && test.moveId !== 'pummel') {
                    dummyGrabbedRef.current = false;
                    grabHoldFramesRef.current = 0;
                    setDummyGrabbed(false);
                  }
                  setDummyPercent(dummyPercentRef.current);
                  setComboCount((count) => count + 1);
                  setLastReaction(reaction);
                  lastReactionRef.current = reaction;
                  setHitReadout(`Hit · ${reaction.damage.toFixed(1)}% · ${reaction.knockback.toFixed(0)} KB · ${reaction.hitstunFrames}f stun`);
                  }
                } else setHitReadout(`Contact · target invincible · hitbox ${hit.hitboxId}`);
              }
            }
          }
          forceIdleVarianceRef.current = false;
          newlyPressedKeys.current.clear();
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
      setAnimationPreview(activeAnimationRef.current);
      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  const isDraftPreview = import.meta.env.DEV && Boolean(requestedPreviewId);
  const handleBack = () => navigate(isDraftPreview ? '/dev/frame-data' : '/');
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
  const modeLabel = animationPreview?.motionState === 'idle-variance'
    ? 'IDLE VARIANCE'
    : movement.jumpSquatFramesRemaining > 0
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
  const visibleAnimationFrame = attackFramePreview ?? animationPreview?.frame;
  const draftSilhouette = visibleAnimationFrame?.silhouette;
  const silhouettePoints = draftSilhouette?.points
    .map(({ x, y }) => `${x},${-y}`)
    .join(' ') ?? '';
  const showDraftSilhouette = Boolean(
    draftSilhouette && draftSilhouette.points.length >= 2,
  );
  const idleVarianceDraftAvailable = Boolean(clips['idle-variance']?.frames.length);
  const clipSource: AnimationClipSource | null = jabTestActive
    ? attackTestRef.current?.clip.source ?? null
    : animationPreview?.clip.source ?? null;
  const clipSourceLabel = clipSource === 'draft'
    ? 'WORKING DRAFT'
    : clipSource === 'approved'
      ? 'APPROVED'
      : clipSource === 'default'
        ? 'DEFAULT SHAPES · NOT APPROVED'
        : 'NO ANIMATION';
  const trajectoryPoints = lastReaction ? (() => {
    const angle = lastReaction.launchAngle * Math.PI / 180;
    let x = 16;
    let y = 0;
    let vx = Math.cos(angle) * lastReaction.launchSpeed;
    let vy = Math.sin(angle) * lastReaction.launchSpeed;
    const points = [`${x},${-y}`];
    for (let frame = 0; frame < 80; frame += 1) {
      const speed = Math.hypot(vx, vy);
      const decay = speed <= 0.051 ? 0 : (speed - 0.051) / speed;
      vx *= decay;
      vy = vy * decay - 0.12;
      x += vx;
      y += vy;
      points.push(`${x},${-y}`);
      if (x < -240 || x > 240 || y < -140 || y > 179) break;
    }
    return points.join(' ');
  })() : null;
  const behaviorPosition = dummyBehavior === 'jump'
    ? { x: 16, y: Math.max(0, Math.sin(dummyFrame * Math.PI / 45) * 18) }
    : dummyBehavior === 'move'
      ? { x: 16 + Math.sin(dummyFrame * Math.PI / 60) * 12, y: 0 }
      : { x: 16, y: 0 };
  const dummyPosition = dummyLaunchedRef.current
    ? { x: dummyRuntimeRef.current.positionX, y: dummyRuntimeRef.current.positionY }
    : dummyGrabbed
      ? { x: Number(movement.positionX) + movement.facingDirection * 2, y: Number(movement.positionY) }
    : behaviorPosition;
  const startJabTest = (attackId: NormalAttackId = selectedAttack) => {
    void import('../data/falcon/trainingClips').then(({ resolveAnimationClip }) => {
      const clip = resolveAnimationClip(attackId);
      if (!clip) return;
      collisionHistoryRef.current.clear();
      attackTestRef.current = { clip, frameIndex: -1, moveId: clip.animationId, damageMultiplier: 1 };
      const data = getNormalAttackData(attackId);
      setHitReadout(`${data.label} · ${clip.source === 'default' ? 'DEFAULT SHAPES · NOT APPROVED' : clip.source === 'approved' ? 'APPROVED DATA' : 'DRAFT'} · target at 16 u`);
      setJabTestActive(true);
    });
  };
  const startDefenseClip = (animationId: string, oosAction?: 'jump' | 'upSmash' | 'upSpecial') => {
    void import('../data/falcon/trainingClips').then(({ resolveAnimationClip }) => {
      const clip = resolveAnimationClip(animationId);
      if (!clip) return;
      collisionHistoryRef.current.clear();
      attackTestRef.current = { clip, frameIndex: -1, moveId: clip.animationId, damageMultiplier: 1 };
      setHitReadout(`${clip.animationId} · ${oosAction ? `${outOfShieldLag(oosAction)}f out of shield` : 'source-timed animation'}`);
      setJabTestActive(true);
    });
  };

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
            <div className="normal-attack-controls">
              <label className="training-settings-button">Normal move
                <select value={selectedAttack} onChange={(event) => setSelectedAttack(event.target.value as NormalAttackId)}>
                  {NORMAL_ATTACK_IDS.map((id) => <option key={id} value={id}>{getNormalAttackData(id).label}</option>)}
                </select>
              </label>
              <button className="training-settings-button" type="button" onClick={() => startJabTest()} disabled={jabTestActive}>Test move → Target</button>
              <small>{(() => { const data = getNormalAttackData(selectedAttack); return <>{data.activeFrames.length ? `Active ${data.activeFrames[0]}–${data.activeFrames[data.activeFrames.length - 1]}f` : 'No active frame data'} · actionable {data.firstActionableFrame}f{data.landingLag ? ` · landing lag ${data.landingLag}f` : ''}{data.autoCancelFrames.length ? ` · autocancel ${data.autoCancelFrames[0]}–${data.autoCancelFrames.at(-1)}f` : ''} · <a href={data.wikiUrl} target="_blank" rel="noreferrer">SmashWiki source ↗</a></>; })()}</small>
              <small>Attack button starts ground/air normals; mapped tilt/smash buttons and left-stick flicks select variants. The right stick follows Controller settings.</small>
            </div>
            <div className="training-hit-readout" role="status" aria-live="polite">{hitReadout}</div>
            <div className="dummy-controls" aria-label="Training dummy">
              <label>Dummy % <input type="number" min="0" max="999" value={dummyPercent.toFixed(1)} onChange={(event) => {
                const value = Math.max(0, Math.min(999, Number(event.target.value) || 0));
                dummyPercentRef.current = value;
                setDummyPercent(value);
              }} /></label>
              <span>Combo {comboCount}</span>
              <span>{dummyRuntimeRef.current.ko ? `KO · ${Math.max(0, 90 - dummyRespawnFramesRef.current)}f respawn` : dummyInvincibleFramesRef.current > 0 ? 'Respawn invincible' : 'Ready'}</span>
              {(dummyRecovery === 'knockdown' || dummyRecovery === 'missed-tech' || dummyRecovery === 'ground-tech') && <label>Get up <select value={getupOption} onChange={(event) => setGetupOption(event.target.value as typeof getupOption)}><option value="neutral">Neutral</option><option value="roll-left">Roll left</option><option value="roll-right">Roll right</option><option value="attack">Attack</option></select></label>}
              {(dummyRecovery === 'knockdown' || dummyRecovery === 'missed-tech' || dummyRecovery === 'ground-tech') && <button type="button" onClick={() => {
                setDummyRecovery(chooseGetup(getupOption));
                dummyRuntimeRef.current = { ...dummyRuntimeRef.current, positionX: 16, positionY: 0, velocityX: 0, velocityY: 0, hitlagFrames: 0, hitstunFrames: 0, ko: false };
              }}>Recover</button>}
              <label>Behavior <select value={dummyBehavior} onChange={(event) => {
                const value = event.target.value as typeof dummyBehavior;
                dummyBehaviorRef.current = value;
                setDummyBehavior(value);
              }}><option value="stand">Stand</option><option value="jump">Jump</option><option value="move">Move</option><option value="shield">Shield</option><option value="parry">Parry practice</option><option value="dodge">Spot dodge</option><option value="roll-forward">Forward roll</option><option value="roll-back">Back roll</option><option value="air-dodge">Neutral air dodge</option><option value="air-dodge-directional">Directional air dodge</option><option value="mash">Mash escape</option></select></label>
              <span>Shield {dummyShieldHealth.toFixed(1)} / 50</span>
              {dummyDodgeLandingLag > 0 && <span>Air-dodge landing lag {dummyDodgeLandingLag}f</span>}
              {dummyGrabbed && <span>Grab hold {grabHoldFramesRef.current}f</span>}
              {dummyGrabbed && <>
                <button type="button" onClick={() => startDefenseClip('pummel')}>Pummel</button>
                <button type="button" onClick={() => startDefenseClip('fthrow')}>F-throw</button>
                <button type="button" onClick={() => startDefenseClip('bthrow')}>B-throw</button>
                <button type="button" onClick={() => startDefenseClip('uthrow')}>Up throw</button>
                <button type="button" onClick={() => startDefenseClip('dthrow')}>Down throw</button>
                <button type="button" onClick={() => { dummyGrabbedRef.current = false; setDummyGrabbed(false); setHitReadout('Grab released'); }}>Release</button>
              </>}
              <div className="training-defense-controls" aria-label="Out of shield practice">
                <span>Out of shield</span>
                <button type="button" onClick={() => startDefenseClip('jump-squat', 'jump')}>Jump · 3f</button>
                <button type="button" onClick={() => startDefenseClip('usmash', 'upSmash')}>Up smash · 0f</button>
                <button type="button" onClick={() => startDefenseClip('falcon-dive', 'upSpecial')}>Up special · 0f</button>
              </div>
              <label>Speed <select value={simSpeed} onChange={(event) => {
                const value = Number(event.target.value);
                simSpeedRef.current = value;
                setSimSpeed(value);
              }}><option value={0}>Paused</option><option value={0.25}>¼×</option><option value={0.5}>½×</option><option value={1}>1×</option></select></label>
              <button type="button" onClick={() => { manualStepsRef.current += 1; }}>Frame advance</button>
              <button type="button" onClick={() => {
                dummyPercentRef.current = 0;
                dummyRuntimeRef.current = { percent: 0, positionX: 16, positionY: 0, velocityX: 0, velocityY: 0, hitlagFrames: 0, hitstunFrames: 0, ko: false };
                dummyShieldRef.current = createShieldState();
                dummyGrabbedRef.current = false;
                grabHoldFramesRef.current = 0;
                setDummyShieldHealth(50);
                setDummyGrabbed(false);
                dummyDodgeLandingLagRef.current = 0;
                setDummyDodgeLandingLag(0);
                wasAirDodgeIntangibleRef.current = false;
                dummyLaunchedRef.current = false;
                dummyInvincibleFramesRef.current = 0;
                staleQueueRef.current = [];
                dummyRespawnFramesRef.current = 0;
                dummyTechWindowRef.current = 0;
                lastReactionRef.current = null;
                setDummyRecovery('airborne');
                setDummyPercent(0); setComboCount(0); setLastReaction(null); setHitReadout('Dummy reset');
              }}>Reset dummy</button>
            </div>
            {lastReaction && <div className="reaction-readout">Launch {lastReaction.launchSpeed.toFixed(2)} u/frame · angle {lastReaction.launchAngle}° · hitlag {lastReaction.hitlagFrames}f{lastReaction.tumble ? ' · tumble' : ''}</div>}
          </div>
        </div>

        {isDraftPreview && (
          <section className="training-draft-preview" aria-label="Development animation draft playtest">
            <div className="training-draft-preview-copy">
              <span className="training-preview-kicker">DEVELOPMENT DRAFT PLAYTEST</span>
              <h3>{previewLoading ? 'Loading saved clips…' : previewDraft?.name ?? 'Draft preview unavailable'}</h3>
              <p>
                Temporary gameplay preview from the development database. These animations are
                not approved or added to source-controlled game data.
              </p>
            </div>
            <div className="training-draft-preview-actions">
              <div className="training-preview-current" role="status" aria-live="polite">
                <span>{previewError ? 'PREVIEW ERROR' : 'NOW PLAYING'}</span>
                <strong>
                  {previewError
                    ? 'Draft could not be loaded'
                    : previewLoading
                      ? 'Loading draft data'
                      : animationPreview
                        ? `${animationPreview.motionState.toUpperCase()} · ${clipSourceLabel} · FRAME ${animationPreview.frame.frameNumber}/${animationPreview.clip.frames.length}`
                        : 'No saved clip for the current state'}
                </strong>
                {previewError && <small>{previewError}</small>}
              </div>
              {idleVarianceDraftAvailable && (
                <button
                  className="training-play-variance-button"
                  type="button"
                  disabled={
                    previewLoading
                    || !movement.isGrounded
                    || movement.mode !== 'idle'
                    || animationPreview?.motionState === 'idle-variance'
                  }
                  onClick={() => {
                    forceIdleVarianceRef.current = true;
                  }}
                >
                  Play idle variance now
                </button>
              )}
            </div>
          </section>
        )}

        <div className="stage-view-controls">
          <span className="stage-view-caption">STAGE VIEW</span>
          <label className="collision-toggle"><input type="checkbox" checked={showCollisionShapes} onChange={(event) => setShowCollisionShapes(event.target.checked)} /> Hitbox display</label>
          {showCollisionShapes && <span className="collision-legend"><i>Hit</i> · <b>Hurt</b> · <em>Grab</em> · <strong>Intangible</strong> · <u>Invincible</u></span>}
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
            {!dummyRuntimeRef.current.ko && <div className="training-target-marker" style={{ left: `${worldToMapX(dummyPosition.x)}%`, top: `${worldToMapY(dummyPosition.y)}%` }} aria-label={`Training target ${dummyPercent.toFixed(1)} percent`}>DUMMY · {dummyPercent.toFixed(1)}%</div>}
            {trajectoryPoints && <svg className="training-trajectory-preview" viewBox="-240 -179 480 319" preserveAspectRatio="none" aria-label="Estimated launch trajectory"><polyline points={trajectoryPoints} /></svg>}
            {showCollisionShapes && (() => {
              const frame = attackFramePreview ?? animationPreview?.frame;
              const fighterPosition = { x: Number(movement.positionX), y: Number(movement.positionY), z: 0 };
              const fighterFacing = movement.facingDirection;
              const hurtboxes = frame?.hurtboxes.length ? frame.hurtboxes : defaultTrainingHurtboxes();
              const capsules = [
                ...hurtboxes.map((box) => ({ box, position: fighterPosition, facing: fighterFacing, color: box.state === 'intangible' ? '#bd74ff' : box.state === 'invincible' ? '#ffd54a' : '#38e08c' })),
                ...defaultTrainingHurtboxes().map((box) => ({ box, position: { ...dummyPosition, z: 0 }, facing: -1 as const, color: '#38e08c' })),
                ...(frame?.hitboxes ?? []).map((box) => ({ box, position: fighterPosition, facing: fighterFacing, color: '#ff4655' })),
                ...(frame?.grabboxes ?? []).map((box) => ({ box, position: fighterPosition, facing: fighterFacing, color: '#55c8ff' })),
              ];
              return <svg className="training-collision-overlay" viewBox="-240 -179 480 319" preserveAspectRatio="none" aria-label="Hitboxes red, grab boxes blue, hurtboxes green, intangible purple, invincible yellow">
                {capsules.map(({ box, position, facing, color }, index) => <line key={`${box.id}-${index}`} x1={position.x + box.start.x * facing} y1={-(position.y + box.start.y)} x2={position.x + box.end.x * facing} y2={-(position.y + box.end.y)} stroke={color} strokeWidth={box.radius * 2} strokeLinecap="round" opacity="0.72" />)}
              </svg>;
            })()}
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
              className={`training-bean is-${movement.mode}${movement.isGrounded ? '' : ' is-airborne'}${movement.isFastFalling ? ' is-fast-falling' : ''}${showDraftSilhouette ? ' has-draft-silhouette' : ''}`}
              style={{
                left: `${fighterPositionPercent}%`,
                top: `${fighterHeightPercent}%`,
              }}
              role="img"
              aria-label={showDraftSilhouette
                ? `Captain Falcon ${animationPreview?.motionState ?? ''} animation (${clipSourceLabel.toLowerCase()})`
                : 'Simple Captain Falcon movement prototype'}
            >
              {showDraftSilhouette && draftSilhouette && (
                <svg
                  className="training-draft-silhouette"
                  viewBox="-5 -19 10 20"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {draftSilhouette.closed ? (
                    <polygon
                      points={silhouettePoints}
                      fill={draftSilhouette.color}
                      stroke={draftSilhouette.color}
                      strokeWidth="0.35"
                      strokeLinejoin="round"
                    />
                  ) : (
                    <polyline
                      points={silhouettePoints}
                      fill="none"
                      stroke={draftSilhouette.color}
                      strokeWidth="0.7"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  )}
                </svg>
              )}
            </div>
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
          <div className={`animation-source is-${clipSource ?? 'none'}`}>
            <span>ANIMATION</span>
            <strong>{clipSourceLabel}</strong>
          </div>
        </div>

        <div className="training-instructions">
          <label className="training-settings-button">Falcon damage % <input type="number" min="0" max="999" value={ledgePercent} onChange={(event) => { const value = Math.max(0, Number(event.target.value) || 0); ledgePercentRef.current = value; setLedgePercent(value); }} style={{ width: '4rem' }} /></label>
          <p><strong>Move:</strong> A / D, your rebinds, or the gamepad D-pad or left stick.</p>
          <p><strong>Analog:</strong> light tilt walks at a scaled speed; a quick full flick dashes; holding full tilt runs.</p>
          <p><strong>Jump:</strong> J / Space, your jump rebinds, or enabled Stick Jump. Hold through the 3-frame squat for a full hop; release during it for a short hop. Press jump again in the air for Falcon’s midair jump.</p>
          <p><strong>Camera:</strong> toggle follow on to track the fighter within the inner camera limits; turn it off to keep the camera at stage center.</p>
          <p><strong>Stage view:</strong> use Blastzone to see the full field or Camera limits to zoom into the inner bounds.</p>
          <p><strong>Fall:</strong> walk or run off either ledge. Hold your down binding (S by default) or tilt the stick down while falling to fast-fall.</p>
          <p><strong>Ledge recovery:</strong> snap to a ledge while falling. After grab recovery: up = getup, shield = roll, jump = ledge jump, attack = Falcon’s ledge attack, down/back = drop. {ledgeReadout}</p>
          <p><strong>Needs confirmation:</strong> snap envelope ±8u; estimated Falcon animation counts: getup 33f, roll 49f, jump 20f, drop 6f; non-attack option intangibility is not sourced yet. Grab intangibility, 19f initial action lockout, 6-grab limit and 390/300f hang times use SmashWiki; ledge attack uses Falcon’s Edge_attack data.</p>
          <p><a href="https://www.ssbwiki.com/Ledge" target="_blank" rel="noreferrer">SmashWiki ledge rules</a> · <a href="https://www.ssbwiki.com/Edge_attack" target="_blank" rel="noreferrer">Captain Falcon ledge attack data</a></p>
          <p><strong>Omega platform:</strong> {Number(TRAINING_STAGE_WIDTH)} u wide, with open ledges at ±{Number(TRAINING_STAGE_HALF_WIDTH)} u.</p>
          <p><strong>Captain Falcon:</strong> gravity {Number(CAPTAIN_FALCON_MOVEMENT.gravity).toFixed(2)} u/frame² · walk {Number(CAPTAIN_FALCON_MOVEMENT.walkSpeed).toFixed(3)} · initial dash {Number(CAPTAIN_FALCON_MOVEMENT.initialDashSpeed).toFixed(3)} · run {Number(CAPTAIN_FALCON_MOVEMENT.runSpeed).toFixed(3)} · fall {Number(CAPTAIN_FALCON_MOVEMENT.fallSpeed).toFixed(3)} · fast fall {Number(CAPTAIN_FALCON_MOVEMENT.fastFallSpeed).toFixed(3)} u/frame.</p>
          <p><strong>Jump heights:</strong> full hop {Number(CAPTAIN_FALCON_MOVEMENT.fullHopHeight)} u · first-four-frame height {Number(CAPTAIN_FALCON_MOVEMENT.jumpInitialHeight)} u · short hop {Number(CAPTAIN_FALCON_MOVEMENT.shortHopHeight)} u · one midair jump {Number(CAPTAIN_FALCON_MOVEMENT.airJumpHeight)} u.</p>
          <p><strong>Diagram-scaled bounds:</strong> blastzone x ±240, y −140 to +179 u · camera x ±180, y −60 to +130 u. These bounds are approximate and scaled from the supplied image.</p>
          <p className="training-note">A jump off the platform keeps one midair jump available. The test jab applies damage and launch to the training dummy; controls remain a combat prototype.</p>
        </div>
      </section>
    </main>
  );
};

export default TrainingScreen;
