import { PanelSection } from './fields';
import { LAYER_ORDER } from './layers';
import type { LayerId, LayerState } from './layers';

export function LayersPanel({
  layers,
  referenceLocked,
  counts,
  onToggle,
  onReferenceLockChange,
}: {
  layers: LayerState;
  referenceLocked: boolean;
  counts: Partial<Record<LayerId, number>>;
  onToggle: (id: LayerId, field: 'visible' | 'locked') => void;
  onReferenceLockChange: (locked: boolean) => void;
}) {
  return (
    <PanelSection title="Layers" kicker="SHOW · LOCK" className="fe-layers">
      <ul className="fe-layer-list">
        {LAYER_ORDER.map((layer) => {
          const flags = layers[layer.id];
          const locked = layer.id === 'reference' ? referenceLocked : flags.locked;
          return (
            <li key={layer.id} className={`fe-layer is-${layer.id}${flags.visible ? '' : ' is-hidden'}`}>
              <button
                type="button"
                className={`fe-layer-eye${flags.visible ? ' is-on' : ''}`}
                aria-pressed={flags.visible}
                aria-label={`${flags.visible ? 'Hide' : 'Show'} ${layer.label}`}
                onClick={() => onToggle(layer.id, 'visible')}
              >
                {flags.visible ? '◉' : '○'}
              </button>
              <span className="fe-layer-swatch" aria-hidden="true" />
              <span className="fe-layer-name">{layer.label}</span>
              {counts[layer.id] !== undefined && <small>{counts[layer.id]}</small>}
              {layer.lockable ? (
                <button
                  type="button"
                  className={`fe-layer-lock${locked ? ' is-locked' : ''}`}
                  aria-pressed={locked}
                  aria-label={`${locked ? 'Unlock' : 'Lock'} ${layer.label}`}
                  title={layer.id === 'reference' ? 'Unlock to drag the reference into place' : undefined}
                  onClick={() => (layer.id === 'reference' ? onReferenceLockChange(!referenceLocked) : onToggle(layer.id, 'locked'))}
                >
                  {locked ? 'LOCKED' : 'EDIT'}
                </button>
              ) : <span className="fe-layer-lock is-placeholder" />}
            </li>
          );
        })}
      </ul>
    </PanelSection>
  );
}
