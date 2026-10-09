import type { ShapeKind } from '../../dev/editorOps';
import type { HurtboxState } from '../../types/frameData';

export type LayerId = 'reference' | 'grid' | 'onion' | 'silhouette' | 'hurtboxes' | 'grabboxes' | 'hitboxes';

export interface LayerFlags {
  visible: boolean;
  locked: boolean;
}

export type LayerState = Record<LayerId, LayerFlags>;

export const LAYER_ORDER: readonly { id: LayerId; label: string; lockable: boolean }[] = [
  { id: 'hitboxes', label: 'Hitboxes', lockable: true },
  { id: 'grabboxes', label: 'Grab boxes', lockable: true },
  { id: 'hurtboxes', label: 'Hurtboxes', lockable: true },
  { id: 'silhouette', label: 'Silhouette', lockable: true },
  { id: 'onion', label: 'Onion skin', lockable: false },
  { id: 'grid', label: 'Grid', lockable: false },
  { id: 'reference', label: 'Reference', lockable: true },
];

export const DEFAULT_LAYERS: LayerState = {
  reference: { visible: true, locked: true },
  grid: { visible: true, locked: false },
  onion: { visible: true, locked: false },
  silhouette: { visible: true, locked: false },
  hurtboxes: { visible: true, locked: false },
  grabboxes: { visible: true, locked: false },
  hitboxes: { visible: true, locked: false },
};

export const KIND_LAYER: Record<ShapeKind, LayerId> = {
  hurtbox: 'hurtboxes',
  hitbox: 'hitboxes',
  grabbox: 'grabboxes',
  point: 'silhouette',
};

/** Shape kinds that can currently be picked (visible and unlocked). */
export function editableKinds(layers: LayerState): ShapeKind[] {
  return (Object.keys(KIND_LAYER) as ShapeKind[]).filter((kind) => {
    const flags = layers[KIND_LAYER[kind]];
    return flags.visible && !flags.locked;
  });
}

export const HURTBOX_COLORS: Record<HurtboxState, string> = {
  normal: '#e8b400',
  intangible: '#2f7ff0',
  invincible: '#1fae5b',
};
export const HITBOX_COLOR = '#e5383b';
export const GRABBOX_COLOR = '#9b4dff';
