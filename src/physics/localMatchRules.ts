export type LocalMatchPhase = 'countdown' | 'playing' | 'sudden-death' | 'paused' | 'finished';

export interface LocalMatchRules {
  phase: LocalMatchPhase;
  stocks: [number, number];
  timeLimitFrames: number;
  framesRemaining: number;
  countdownFrames: number;
  winner: 0 | 1 | null;
  suddenDeath: boolean;
}

export function createLocalMatchRules(stockCount = 3, timeLimitSeconds = 420): LocalMatchRules {
  const stocks = Math.max(1, Math.min(9, Math.floor(stockCount) || 3));
  const seconds = Math.max(0, Math.min(999, Math.floor(timeLimitSeconds) || 0));
  return {
    phase: 'countdown',
    stocks: [stocks, stocks],
    timeLimitFrames: seconds * 60,
    framesRemaining: seconds * 60,
    countdownFrames: 240,
    winner: null,
    suddenDeath: false,
  };
}

export function countdownLabel(frames: number): string {
  if (frames > 180) return '3';
  if (frames > 120) return '2';
  if (frames > 60) return '1';
  return 'GO!';
}

export function advanceLocalMatchRules(rules: LocalMatchRules, frames = 1): LocalMatchRules {
  if (rules.phase === 'countdown') {
    const countdownFrames = Math.max(0, rules.countdownFrames - Math.max(0, frames));
    return { ...rules, countdownFrames, phase: countdownFrames === 0 ? 'playing' : 'countdown' };
  }
  if (rules.phase !== 'playing' || rules.timeLimitFrames === 0) return rules;
  const framesRemaining = Math.max(0, rules.framesRemaining - Math.max(0, frames));
  return { ...rules, framesRemaining };
}

export function resolveLocalMatchTimeout(
  rules: LocalMatchRules,
  percentages: readonly [number, number],
): LocalMatchRules {
  if (rules.phase !== 'playing' || rules.framesRemaining > 0 || rules.timeLimitFrames === 0) return rules;
  if (rules.stocks[0] !== rules.stocks[1]) {
    return { ...rules, phase: 'finished', winner: rules.stocks[0] > rules.stocks[1] ? 0 : 1 };
  }
  if (percentages[0] !== percentages[1]) {
    return { ...rules, phase: 'finished', winner: percentages[0] < percentages[1] ? 0 : 1 };
  }
  return { ...rules, phase: 'sudden-death', suddenDeath: true, stocks: [1, 1], framesRemaining: 0 };
}

export function loseLocalMatchStock(rules: LocalMatchRules, player: 0 | 1): LocalMatchRules {
  if (rules.phase !== 'playing' && rules.phase !== 'sudden-death') return rules;
  const stocks: [number, number] = [...rules.stocks];
  stocks[player] = Math.max(0, stocks[player] - 1);
  if (stocks[player] === 0) {
    return { ...rules, stocks, phase: 'finished', winner: player === 0 ? 1 : 0 };
  }
  return { ...rules, stocks };
}

export function formatMatchTime(frames: number): string {
  const totalSeconds = Math.ceil(Math.max(0, frames) / 60);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}
