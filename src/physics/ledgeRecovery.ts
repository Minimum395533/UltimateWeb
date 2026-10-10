import { TRAINING_STAGE_HALF_WIDTH } from './trainingMovement.ts';
import { worldUnits } from './units.ts';
import type { WorldUnit } from './units.ts';
import { getCatalogEntry } from '../data/falcon/animationCatalog.ts';

export type LedgeSide = -1 | 1;
export type LedgeOption = 'getup' | 'roll' | 'jump' | 'drop' | 'attack';

export const ULTIMATE_LEDGE = {
  maxRegrabs: 6,
  grabActionLockoutFrames: 19,
  maxAirTimeForIntangibility: 300,
  maxPercentForIntangibility: 120,
  hangTimeFramesBelow100: 390,
  hangTimeFramesAt100Plus: 300,
  // Recovery snap envelope and option invulnerability are not specified here:
  // they are fighter/animation-specific and require confirmation.
} as const;

export const LEDGE_ANIMATION_IDS: Record<LedgeOption, string> = {
  getup: 'ledge-getup',
  roll: 'ledge-roll',
  jump: 'ledge-jump',
  drop: 'ledge-drop',
  attack: 'ledge-attack',
};

export interface LedgeRecoveryState {
  side: LedgeSide | null;
  grabCount: number;
  airtimeFrames: number;
  hangFrames: number;
  intangibilityFrames: number;
  option: LedgeOption | null;
  optionFrame: number;
  trumped: boolean;
}

export function createLedgeRecoveryState(): LedgeRecoveryState {
  return { side: null, grabCount: 0, airtimeFrames: 0, hangFrames: 0, intangibilityFrames: 0, option: null, optionFrame: 0, trumped: false };
}

export function detectLedgeGrab(
  x: number,
  y: number,
  velocityY: number,
  canGrab: boolean,
  snapRadius = 8,
): LedgeSide | null {
  if (!canGrab || velocityY > 0 || y > 0 || y < -snapRadius) return null;
  const edge = Number(TRAINING_STAGE_HALF_WIDTH);
  if (Math.abs(x - edge) <= snapRadius) return 1;
  if (Math.abs(x + edge) <= snapRadius) return -1;
  return null;
}

export function ledgeGrabIntangibility(airtimeFrames: number, percent: number): number {
  const airtime = Math.max(0, Math.min(ULTIMATE_LEDGE.maxAirTimeForIntangibility, airtimeFrames));
  const damage = Math.max(0, Math.min(ULTIMATE_LEDGE.maxPercentForIntangibility, percent));
  // SmashWiki Ledge: ((60 * airtime / 300) + 44 - 44 * percent / 120)
  // plus the 19-frame ledge-grab animation; observed range is 23–123f.
  return Math.max(23, Math.min(123, Math.round(19 + 60 * airtime / 300 + 44 * (1 - damage / 120))));
}

export function grabLedge(
  state: LedgeRecoveryState,
  side: LedgeSide,
  airtimeFrames: number,
  percent: number,
  afterHitstun = false,
): LedgeRecoveryState | null {
  const count = afterHitstun ? 0 : state.grabCount;
  if (count >= ULTIMATE_LEDGE.maxRegrabs) return null;
  return {
    ...state,
    side,
    grabCount: count + 1,
    airtimeFrames: 0,
    hangFrames: 0,
    intangibilityFrames: count === 0 || afterHitstun ? ledgeGrabIntangibility(airtimeFrames, percent) : 0,
    option: null,
    optionFrame: 0,
    trumped: false,
  };
}

export function canChooseLedgeOption(state: LedgeRecoveryState): boolean {
  return state.side !== null && state.option === null
    && state.hangFrames >= ledgeGrabActionDelayFrames(state.grabCount);
}

export function ledgeGrabActionDelayFrames(grabCount: number): number {
  const speed = [1, 1, 0.9375, 0.875, 0.8125, 0.75][Math.max(0, Math.min(5, Math.floor(grabCount) - 1))] ?? 1;
  return Math.ceil(ULTIMATE_LEDGE.grabActionLockoutFrames / speed);
}

export function chooseLedgeOption(state: LedgeRecoveryState, option: LedgeOption): LedgeRecoveryState {
  if (!canChooseLedgeOption(state)) return state;
  return { ...state, option, optionFrame: 0, intangibilityFrames: 0 };
}

export function ledgeOptionFrameCount(option: LedgeOption): number {
  return getCatalogEntry(LEDGE_ANIMATION_IDS[option])?.frameCount ?? 0;
}

export function ledgeOptionIntangible(state: LedgeRecoveryState): boolean {
  if (state.option === 'attack') {
    // Falcon's Edge_attack table gives 1-24f on a first grab, less on regrabs.
    const end = state.grabCount <= 1 ? 24 : state.grabCount === 2 ? 19 : 12;
    return state.optionFrame >= 1 && state.optionFrame <= end;
  }
  return state.option === null && state.intangibilityFrames > 0;
}

export function stepLedge(state: LedgeRecoveryState): LedgeRecoveryState {
  if (state.side === null) return { ...state, airtimeFrames: state.airtimeFrames + 1 };
  if (state.option === null) return { ...state, hangFrames: state.hangFrames + 1, intangibilityFrames: Math.max(0, state.intangibilityFrames - 1) };
  const nextFrame = state.optionFrame + 1;
  if (state.option === 'drop' || nextFrame >= ledgeOptionFrameCount(state.option)) {
    return { ...state, side: null, optionFrame: nextFrame, intangibilityFrames: 0 };
  }
  return { ...state, optionFrame: nextFrame };
}

export function trumpLedge(occupant: string | null, challenger: string): { occupant: string | null; trumped: string | null } {
  return occupant === null || occupant === challenger
    ? { occupant: challenger, trumped: null }
    : { occupant: challenger, trumped: occupant };
}

export function snapLedgePosition(side: LedgeSide): WorldUnit {
  return worldUnits(side * Number(TRAINING_STAGE_HALF_WIDTH));
}

export function ledgeHangLimit(percent: number): number {
  return percent >= 100 ? ULTIMATE_LEDGE.hangTimeFramesAt100Plus : ULTIMATE_LEDGE.hangTimeFramesBelow100;
}
