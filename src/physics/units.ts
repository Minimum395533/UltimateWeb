/**
 * Canonical gameplay dimensions.
 *
 * A gameplay frame is one discrete simulation update, independent of browser
 * render frames. Conversions to seconds therefore always require an explicit
 * simulation rate.
 */
declare const worldUnitBrand: unique symbol;
declare const metersBrand: unique symbol;
declare const unitsPerFrameBrand: unique symbol;
declare const unitsPerFrameSquaredBrand: unique symbol;
declare const metersPerSecondBrand: unique symbol;
declare const metersPerSecondSquaredBrand: unique symbol;
declare const framesPerSecondBrand: unique symbol;
declare const gameplayFrameIndexBrand: unique symbol;

export type WorldUnit = number & { readonly [worldUnitBrand]: 'WorldUnit' };
export type Meters = number & { readonly [metersBrand]: 'Meters' };
export type WorldUnitsPerFrame = number & {
  readonly [unitsPerFrameBrand]: 'WorldUnitsPerFrame';
};
export type WorldUnitsPerFrameSquared = number & {
  readonly [unitsPerFrameSquaredBrand]: 'WorldUnitsPerFrameSquared';
};
export type FrictionPerFrameSquared = WorldUnitsPerFrameSquared;
export type GravityPerFrameSquared = WorldUnitsPerFrameSquared;
export type MetersPerSecond = number & {
  readonly [metersPerSecondBrand]: 'MetersPerSecond';
};
export type MetersPerSecondSquared = number & {
  readonly [metersPerSecondSquaredBrand]: 'MetersPerSecondSquared';
};
export type FramesPerSecond = number & {
  readonly [framesPerSecondBrand]: 'FramesPerSecond';
};
export type GameplayFrameIndex = number & {
  readonly [gameplayFrameIndexBrand]: 'GameplayFrameIndex';
};

export interface WorldPosition2 {
  readonly x: WorldUnit;
  readonly y: WorldUnit;
}

/** A displacement or local hitbox offset, measured in world units. */
export interface WorldOffset2 {
  readonly x: WorldUnit;
  readonly y: WorldUnit;
}

/** Velocity components are measured in world units per gameplay frame. */
export interface Velocity2 {
  readonly x: WorldUnitsPerFrame;
  readonly y: WorldUnitsPerFrame;
}

/** Acceleration components are measured in world units per frame squared. */
export interface Acceleration2 {
  readonly x: WorldUnitsPerFrameSquared;
  readonly y: WorldUnitsPerFrameSquared;
}

export const WORLD_UNIT_SYMBOL = 'u' as const;
export const METERS_PER_WORLD_UNIT = 0.1;
export const WORLD_UNITS_PER_METER = 1 / METERS_PER_WORLD_UNIT;
export const GAMEPLAY_FRAME_DEFINITION =
  'One discrete simulation update, independent of browser render frames.' as const;

function finiteValue(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} must be a finite number`);
  }
  return value;
}

export function worldUnits(value: number): WorldUnit {
  return finiteValue(value, 'World distance') as WorldUnit;
}

export function meters(value: number): Meters {
  return finiteValue(value, 'Distance in meters') as Meters;
}

export function unitsPerFrame(value: number): WorldUnitsPerFrame {
  return finiteValue(value, 'Velocity') as WorldUnitsPerFrame;
}

export function unitsPerFrameSquared(value: number): WorldUnitsPerFrameSquared {
  return finiteValue(value, 'Acceleration') as WorldUnitsPerFrameSquared;
}

export function metersPerSecond(value: number): MetersPerSecond {
  return finiteValue(value, 'Speed in meters per second') as MetersPerSecond;
}

export function metersPerSecondSquared(value: number): MetersPerSecondSquared {
  return finiteValue(value, 'Acceleration in meters per second squared') as MetersPerSecondSquared;
}

export function framesPerSecond(value: number): FramesPerSecond {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError('Simulation frame rate must be a finite number greater than zero');
  }
  return value as FramesPerSecond;
}

export function gameplayFrameIndex(value: number): GameplayFrameIndex {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError('Gameplay frame index must be a non-negative safe integer');
  }
  return value as GameplayFrameIndex;
}

export function worldPosition2(x: number, y: number): WorldPosition2 {
  return { x: worldUnits(x), y: worldUnits(y) };
}

export function worldOffset2(x: number, y: number): WorldOffset2 {
  return { x: worldUnits(x), y: worldUnits(y) };
}

export function velocity2(x: number, y: number): Velocity2 {
  return { x: unitsPerFrame(x), y: unitsPerFrame(y) };
}

export function acceleration2(x: number, y: number): Acceleration2 {
  return { x: unitsPerFrameSquared(x), y: unitsPerFrameSquared(y) };
}

export function worldUnitsToMeters(distance: WorldUnit): Meters {
  return meters(distance * METERS_PER_WORLD_UNIT);
}

export function metersToWorldUnits(distance: Meters): WorldUnit {
  return worldUnits(distance / METERS_PER_WORLD_UNIT);
}

function validatedFrameRate(rate: FramesPerSecond): number {
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new RangeError('Simulation frame rate must be a finite number greater than zero');
  }
  return rate;
}

export function unitsPerFrameToMetersPerSecond(
  speed: WorldUnitsPerFrame,
  rate: FramesPerSecond,
): MetersPerSecond {
  return metersPerSecond(speed * METERS_PER_WORLD_UNIT * validatedFrameRate(rate));
}

export function metersPerSecondToUnitsPerFrame(
  speed: MetersPerSecond,
  rate: FramesPerSecond,
): WorldUnitsPerFrame {
  return unitsPerFrame(speed / (METERS_PER_WORLD_UNIT * validatedFrameRate(rate)));
}

export function unitsPerFrameSquaredToMetersPerSecondSquared(
  acceleration: WorldUnitsPerFrameSquared,
  rate: FramesPerSecond,
): MetersPerSecondSquared {
  const framesPerSecondValue = validatedFrameRate(rate);
  return metersPerSecondSquared(
    acceleration * METERS_PER_WORLD_UNIT * framesPerSecondValue ** 2,
  );
}

export function metersPerSecondSquaredToUnitsPerFrameSquared(
  acceleration: MetersPerSecondSquared,
  rate: FramesPerSecond,
): WorldUnitsPerFrameSquared {
  const framesPerSecondValue = validatedFrameRate(rate);
  return unitsPerFrameSquared(
    acceleration / (METERS_PER_WORLD_UNIT * framesPerSecondValue ** 2),
  );
}
