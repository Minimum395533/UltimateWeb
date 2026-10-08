import {
  unitsPerFrame,
  unitsPerFrameToMetersPerSecond,
} from './units';
import type { WorldUnit } from './units';

function compileTimeDimensionChecks(): void {
  // @ts-expect-error Velocity cannot be used as a world-space distance.
  const distance: WorldUnit = unitsPerFrame(1);
  // @ts-expect-error A simulation rate is required for per-frame conversion.
  unitsPerFrameToMetersPerSecond(unitsPerFrame(1));
  void distance;
}

void compileTimeDimensionChecks;
