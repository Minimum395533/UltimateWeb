import type { ReferenceSettings } from '../../types/frameData';

/** Base SVG space: 10 px per Smash unit, origin (0, 0) at (240, 280). */
export const VIEW = { width: 480, height: 320 } as const;
export const PX_PER_UNIT = 10;
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 6;

export const unitToX = (x: number) => (x + 24) * PX_PER_UNIT;
export const unitToY = (y: number) => (28 - y) * PX_PER_UNIT;
export const xToUnit = (x: number) => x / PX_PER_UNIT - 24;
export const yToUnit = (y: number) => 28 - y / PX_PER_UNIT;

export interface Camera {
  /** View center in base SVG coordinates. */
  cx: number;
  cy: number;
  zoom: number;
}

export const DEFAULT_CAMERA: Camera = { cx: VIEW.width / 2, cy: VIEW.height / 2, zoom: 1 };

export const clampZoom = (zoom: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));

export function cameraViewBox(camera: Camera) {
  const width = VIEW.width / camera.zoom;
  const height = VIEW.height / camera.zoom;
  return { x: camera.cx - width / 2, y: camera.cy - height / 2, width, height };
}

/** Camera that fits a unit-space rectangle with some padding. */
export function fitCamera(rect: { minX: number; minY: number; maxX: number; maxY: number }): Camera {
  const padding = 3;
  const left = unitToX(rect.minX - padding);
  const right = unitToX(rect.maxX + padding);
  const top = unitToY(rect.maxY + padding);
  const bottom = unitToY(rect.minY - padding);
  const zoom = clampZoom(Math.min(VIEW.width / Math.max(1, right - left), VIEW.height / Math.max(1, bottom - top)));
  return { cx: (left + right) / 2, cy: (top + bottom) / 2, zoom };
}

/** Reference image placement in base SVG coordinates (kept stable for saved alignments). */
export function referenceImageBox(settings: ReferenceSettings) {
  return {
    x: 240 + settings.offsetX * PX_PER_UNIT - 70 * settings.scale,
    y: 280 - settings.offsetY * PX_PER_UNIT - 120 * settings.scale,
    width: 140 * settings.scale,
    height: 240 * settings.scale,
  };
}

export const roundTo = (value: number, step: number) => (step > 0 ? Math.round(value / step) * step : value);
export const round2 = (value: number) => Math.round(value * 100) / 100;
