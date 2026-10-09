import { DEFAULT_SHAPE_DEFAULTS } from '../../dev/frameDataModel';
import type { ShapeDefaults } from '../../dev/frameDataModel';

/** Editor-wide preferences, stored in this browser only. */
export interface EditorDefaults {
  shapes: ShapeDefaults;
  snapEnabled: boolean;
  /** Grid snap increment for drags, in Smash units. */
  snapIncrement: number;
  /** Arrow-key nudge distance in units (Shift multiplies by 10). */
  nudgeStep: number;
  onionSkin: boolean;
  playbackSpeed: number;
}

export const DEFAULT_EDITOR_DEFAULTS: EditorDefaults = {
  shapes: DEFAULT_SHAPE_DEFAULTS,
  snapEnabled: false,
  snapIncrement: 0.5,
  nudgeStep: 0.1,
  onionSkin: true,
  playbackSpeed: 1,
};

const STORAGE_KEY = 'frame-editor-defaults-v1';

export function loadEditorDefaults(): EditorDefaults {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_EDITOR_DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<EditorDefaults>;
    return {
      ...DEFAULT_EDITOR_DEFAULTS,
      ...parsed,
      shapes: {
        ...DEFAULT_SHAPE_DEFAULTS,
        ...parsed.shapes,
        hitbox: { ...DEFAULT_SHAPE_DEFAULTS.hitbox, ...parsed.shapes?.hitbox },
      },
    };
  } catch {
    return DEFAULT_EDITOR_DEFAULTS;
  }
}

export function saveEditorDefaults(defaults: EditorDefaults) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  } catch {
    // Storage can be unavailable (private mode); defaults then last for this session only.
  }
}
