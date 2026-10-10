import type { TrainingControlInput } from './trainingInput.ts';

export type FalconSpecial = 'falcon-punch' | 'raptor-boost' | 'falcon-dive' | 'falcon-kick';

export function falconSpecialContactWindow(command: FalconSpecialCommand): readonly [number, number] {
  switch (command.move) {
    case 'falcon-punch': return command.reversed ? [62, 66] : [53, 57];
    case 'raptor-boost': return command.aerial ? [19, 35] : [10, 25];
    case 'falcon-dive': return [14, 30];
    case 'falcon-kick': return command.aerial ? [14, 27] : [13, 33];
  }
}

export interface FalconSpecialCommand {
  move: FalconSpecial;
  aerial: boolean;
  reversed: boolean;
  wavebounce: boolean;
  smashedSideInput: boolean;
}

export function selectFalconSpecial(
  input: TrainingControlInput,
  grounded: boolean,
  facing: -1 | 1,
  smashedSideInput = false,
): FalconSpecialCommand {
  const horizontal = input.horizontal;
  const vertical = input.vertical;
  const move: FalconSpecial = vertical > 0.65
    ? 'falcon-dive'
    : vertical < -0.65
      ? 'falcon-kick'
      : Math.abs(horizontal) > 0.65
        ? 'raptor-boost'
        : 'falcon-punch';
  const oppositeInput = horizontal * facing < -0.65;
  const wavebounce = oppositeInput && (move === 'raptor-boost' || move === 'falcon-kick');
  return {
    move,
    aerial: !grounded,
    reversed: oppositeInput,
    wavebounce,
    smashedSideInput: move === 'raptor-boost' && smashedSideInput,
  };
}

export function falconSpecialAnimationId(command: FalconSpecialCommand): string {
  const suffix = command.aerial ? '-air' : '';
  if (command.move === 'falcon-punch') {
    return `falcon-punch${suffix}${command.reversed ? '-reverse' : ''}`;
  }
  if (command.move === 'raptor-boost') return `raptor-boost${suffix}`;
  if (command.move === 'falcon-kick') return `falcon-kick${suffix}`;
  return 'falcon-dive';
}

export function specialRequiresHelplessFall(command: FalconSpecialCommand): boolean {
  return command.move === 'falcon-dive'
    || (command.aerial && (command.move === 'raptor-boost' || command.move === 'falcon-kick'));
}

export function falconSpecialCanBReverse(command: FalconSpecialCommand): boolean {
  // Falcon Punch has a dedicated turnaround-B animation rather than a B-reverse.
  return command.move !== 'falcon-punch';
}

export function falconSpecialArmorFrames(command: FalconSpecialCommand): readonly [number, number] | null {
  return command.move === 'raptor-boost' && !command.aerial ? [1, 5] : null;
}

export function specialLandingAnimationId(command: FalconSpecialCommand): string | null {
  if (command.move === 'falcon-dive') return 'falcon-dive-landing';
  if (!command.aerial) return null;
  if (command.move === 'raptor-boost') return 'raptor-boost-landing';
  if (command.move === 'falcon-kick') return 'falcon-kick-landing';
  return null;
}

