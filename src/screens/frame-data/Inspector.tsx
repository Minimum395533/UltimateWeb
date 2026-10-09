import type { CSSProperties } from 'react';
import {
  deleteSelection,
  flipSelection,
  scaleSelection,
  selectionBounds,
  translateSelection,
} from '../../dev/editorOps';
import type { Selection, ShapeRef } from '../../dev/editorOps';
import {
  HITBOX_ATTACK_TYPES,
  HITBOX_EFFECTS,
  HITBOX_FACING,
  HITBOX_SOUND_LEVELS,
  HURTBOX_STATES,
  SPECIAL_HITBOX_ANGLES,
} from '../../types/frameData';
import type {
  AnimationFrame,
  FrameGrabbox,
  FrameHitbox,
  FrameHurtbox,
  FramePoint3,
  HitboxSource,
  HurtboxState,
} from '../../types/frameData';
import { PanelSection, SelectField, SliderField, ToggleField } from './fields';
import { HURTBOX_COLORS } from './layers';
import { grabboxModified, modifiedHitboxKeys, restoreWikiHitbox } from './wikiDiff';
import type { WikiHitboxKey } from './wikiDiff';

type Capsule = FrameHurtbox | FrameHitbox | FrameGrabbox;
type CapsuleKind = 'hurtbox' | 'hitbox' | 'grabbox';
const LIST_KEY = { hurtbox: 'hurtboxes', hitbox: 'hitboxes', grabbox: 'grabboxes' } as const;

const KIND_LABEL: Record<string, string> = { hurtbox: 'hurtbox(es)', hitbox: 'hitbox(es)', grabbox: 'grab box(es)', point: 'point(s)' };

const STATE_HELP: Record<HurtboxState, string> = {
  normal: 'Can be hit.',
  intangible: 'Attacks pass through.',
  invincible: 'Attacks connect but deal nothing.',
};

function SourceNote({ source, modified, onRestore }: { source: HitboxSource; modified: boolean; onRestore?: () => void }) {
  if (source.kind === 'custom') {
    return <p className="fe-source is-custom">Custom shape · not from SmashWiki</p>;
  }
  return (
    <div className={`fe-source${modified ? ' is-modified' : ''}`}>
      <span>
        SmashWiki · {source.section} · {source.group} · ID {source.wikiId}
        {modified && <strong> · modified from wiki</strong>}
      </span>
      <span className="fe-source-actions">
        <a href={source.url} target="_blank" rel="noreferrer">Open source</a>
        {modified && onRestore && <button type="button" className="fe-link-button" onClick={onRestore}>Restore wiki values</button>}
      </span>
      <small>Position is approximate and needs your approval; the numbers are the wiki values.</small>
    </div>
  );
}

function PointFields({
  label,
  point,
  onChange,
}: {
  label: string;
  point: FramePoint3;
  onChange: (point: FramePoint3) => void;
}) {
  return (
    <fieldset className="fe-fieldset">
      <legend>{label}</legend>
      <SliderField label="X" value={point.x} min={-60} max={60} step={0.1} unit="u" onChange={(x) => onChange({ ...point, x })} />
      <SliderField label="Y" value={point.y} min={-30} max={60} step={0.1} unit="u" onChange={(y) => onChange({ ...point, y })} />
      <SliderField label="Z" value={point.z} min={-30} max={30} step={0.1} unit="u" hint="depth, not drawn" onChange={(z) => onChange({ ...point, z })} />
    </fieldset>
  );
}

const HITBOX_NUMBER_FIELDS: { key: keyof FrameHitbox & WikiHitboxKey | 'hitboxId'; label: string; min: number; max: number; step: number; unit?: string }[] = [
  { key: 'hitboxId', label: 'Hitbox ID', min: 0, max: 15, step: 1 },
  { key: 'part', label: 'Part', min: 0, max: 15, step: 1 },
  { key: 'damage', label: 'Damage', min: 0, max: 100, step: 0.1, unit: '%' },
  { key: 'angle', label: 'Angle', min: 0, max: 368, step: 1, unit: '°' },
  { key: 'baseKnockback', label: 'Base knockback', min: 0, max: 300, step: 1 },
  { key: 'knockbackGrowth', label: 'Knockback growth', min: 0, max: 300, step: 1 },
  { key: 'fixedKnockback', label: 'Fixed knockback', min: 0, max: 300, step: 1 },
  { key: 'shieldDamage', label: 'Shield damage', min: -50, max: 100, step: 1 },
  { key: 'hitlagMultiplier', label: 'Hitlag multiplier', min: 0, max: 5, step: 0.1, unit: '×' },
  { key: 'sdiMultiplier', label: 'SDI multiplier', min: 0, max: 5, step: 0.1, unit: '×' },
  { key: 'shieldstunMultiplier', label: 'Shieldstun multiplier', min: 0, max: 5, step: 0.1, unit: '×' },
  { key: 'extraShieldstunFrames', label: 'Extra shieldstun', min: 0, max: 60, step: 1, unit: 'f' },
  { key: 'tripChance', label: 'Trip chance', min: 0, max: 100, step: 1, unit: '%' },
  { key: 'rehitRate', label: 'Rehit rate', min: 0, max: 60, step: 1, unit: 'f' },
];

const HITBOX_BOOLEAN_FIELDS: { key: WikiHitboxKey; label: string }[] = [
  { key: 'hitsGrounded', label: 'Hits grounded' },
  { key: 'hitsAerial', label: 'Hits aerial' },
  { key: 'setWeight', label: 'Set weight' },
  { key: 'clang', label: 'Clang' },
  { key: 'rebound', label: 'Rebound' },
  { key: 'direct', label: 'Direct' },
  { key: 'blockable', label: 'Blockable' },
  { key: 'reflectable', label: 'Reflectable' },
  { key: 'absorbable', label: 'Absorbable' },
  { key: 'flinchless', label: 'Flinchless' },
  { key: 'noGfx', label: 'No GFX' },
  { key: 'heedless', label: 'Heedless' },
];

export function Inspector({
  frame,
  selection,
  nudgeStep,
  onFrameChange,
  onSelectionChange,
}: {
  frame: AnimationFrame;
  selection: Selection;
  nudgeStep: number;
  onFrameChange: (frame: AnimationFrame, historyKey: string | null) => void;
  onSelectionChange: (selection: ShapeRef[]) => void;
}) {
  const updateCapsule = (kind: CapsuleKind, id: string, patch: Partial<Capsule>, field: string) => {
    const key = LIST_KEY[kind];
    onFrameChange({
      ...frame,
      [key]: (frame[key] as Capsule[]).map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }, `field:${id}:${field}`);
  };

  if (selection.length === 0) {
    return (
      <PanelSection title="Inspector" kicker="NOTHING SELECTED" className="fe-inspector">
        <p className="fe-help">
          Click a shape to edit it. Shift-click or drag a box on empty space to select several.
          Frame {frame.frameNumber}: {frame.hurtboxes.length} hurtboxes, {frame.hitboxes.length} hitboxes,
          {' '}{frame.grabboxes.length} grab boxes, {frame.silhouette.points.length} silhouette points.
        </p>
        <fieldset className="fe-fieldset">
          <legend>Silhouette (presentation only)</legend>
          <label className="fe-color-field">
            Color
            <input
              type="color"
              value={frame.silhouette.color}
              onChange={(event) => onFrameChange({ ...frame, silhouette: { ...frame.silhouette, color: event.currentTarget.value } }, 'silhouette-color')}
            />
          </label>
          <ToggleField
            label="Closed shape"
            checked={frame.silhouette.closed}
            onChange={(closed) => onFrameChange({ ...frame, silhouette: { ...frame.silhouette, closed } }, null)}
          />
        </fieldset>
      </PanelSection>
    );
  }

  const single = selection.length === 1 ? selection[0] : null;

  if (single?.kind === 'point') {
    const point = frame.silhouette.points.find((item) => item.id === single.id);
    if (!point) return null;
    const updatePoint = (patch: { x?: number; y?: number }, field: string) => onFrameChange({
      ...frame,
      silhouette: {
        ...frame.silhouette,
        points: frame.silhouette.points.map((item) => (item.id === point.id ? { ...item, ...patch } : item)),
      },
    }, `field:${point.id}:${field}`);
    return (
      <PanelSection title="Silhouette point" kicker={`POINT ${frame.silhouette.points.indexOf(point) + 1}`} className="fe-inspector">
        <SliderField label="X" value={point.x} min={-60} max={60} step={0.1} unit="u" onChange={(x) => updatePoint({ x }, 'x')} />
        <SliderField label="Y" value={point.y} min={-30} max={60} step={0.1} unit="u" onChange={(y) => updatePoint({ y }, 'y')} />
        <button type="button" className="fe-button is-danger" onClick={() => { onFrameChange(deleteSelection(frame, selection), null); onSelectionChange([]); }}>Delete point</button>
      </PanelSection>
    );
  }

  if (single) {
    const kind = single.kind as CapsuleKind;
    const capsule = (frame[LIST_KEY[kind]] as Capsule[]).find((item) => item.id === single.id);
    if (!capsule) return null;
    const geometry = (
      <>
        <PointFields label="Endpoint A" point={capsule.start} onChange={(start) => updateCapsule(kind, capsule.id, { start }, 'start')} />
        <PointFields label="Endpoint B" point={capsule.end} onChange={(end) => updateCapsule(kind, capsule.id, { end }, 'end')} />
        <div className="fe-inline-actions">
          <button type="button" className="fe-button is-small" onClick={() => updateCapsule(kind, capsule.id, { end: { ...capsule.start } }, 'collapse')}>Make sphere (B = A)</button>
        </div>
      </>
    );
    const remove = (
      <button type="button" className="fe-button is-danger" onClick={() => { onFrameChange(deleteSelection(frame, selection), null); onSelectionChange([]); }}>
        Delete {kind === 'grabbox' ? 'grab box' : kind}
      </button>
    );

    if (kind === 'hurtbox') {
      const hurtbox = capsule as FrameHurtbox;
      return (
        <PanelSection title="Hurtbox" kicker={hurtbox.part ? hurtbox.part.toUpperCase() : 'CAPSULE'} className="fe-inspector">
          <div className="fe-segmented" role="radiogroup" aria-label="Hurtbox state">
            {HURTBOX_STATES.map((state) => (
              <button
                type="button"
                key={state}
                role="radio"
                aria-checked={hurtbox.state === state}
                className={hurtbox.state === state ? 'is-active' : ''}
                style={{ '--fe-state': HURTBOX_COLORS[state] } as CSSProperties}
                onClick={() => updateCapsule('hurtbox', hurtbox.id, { state }, `state-${state}`)}
                title={STATE_HELP[state]}
              >
                {state}
              </button>
            ))}
          </div>
          <p className="fe-help">{STATE_HELP[hurtbox.state]}</p>
          <label className="fe-text-field">
            Body part label
            <input
              type="text"
              maxLength={60}
              value={hurtbox.part ?? ''}
              onChange={(event) => updateCapsule('hurtbox', hurtbox.id, { part: event.currentTarget.value || undefined }, 'part')}
            />
          </label>
          <SliderField label="Radius" value={hurtbox.radius} min={0.1} max={30} step={0.1} unit="u" onChange={(radius) => updateCapsule('hurtbox', hurtbox.id, { radius }, 'radius')} />
          {geometry}
          {remove}
        </PanelSection>
      );
    }

    if (kind === 'grabbox') {
      const grabbox = capsule as FrameGrabbox;
      const modified = grabboxModified(grabbox);
      return (
        <PanelSection title="Grab box" kicker={`ID ${grabbox.grabboxId}`} className="fe-inspector">
          <SourceNote source={grabbox.source} modified={modified} />
          <SliderField label="Grab box ID" value={grabbox.grabboxId} min={0} max={15} step={1} onChange={(grabboxId) => updateCapsule('grabbox', grabbox.id, { grabboxId }, 'grabboxId')} />
          <SliderField label="Radius" value={grabbox.radius} min={0.1} max={30} step={0.1} unit="u" modified={modified} onChange={(radius) => updateCapsule('grabbox', grabbox.id, { radius }, 'radius')} />
          <div className="fe-toggle-grid">
            <ToggleField label="Hits grounded" checked={grabbox.hitsGrounded} onChange={(hitsGrounded) => updateCapsule('grabbox', grabbox.id, { hitsGrounded }, 'hitsGrounded')} />
            <ToggleField label="Hits aerial" checked={grabbox.hitsAerial} onChange={(hitsAerial) => updateCapsule('grabbox', grabbox.id, { hitsAerial }, 'hitsAerial')} />
          </div>
          {geometry}
          {remove}
        </PanelSection>
      );
    }

    const hitbox = capsule as FrameHitbox;
    const modified = modifiedHitboxKeys(hitbox);
    const set = (patch: Partial<FrameHitbox>, field: string) => updateCapsule('hitbox', hitbox.id, patch, field);
    return (
      <PanelSection title="Hitbox" kicker={`ID ${hitbox.hitboxId} · PART ${hitbox.part}`} className="fe-inspector">
        <SourceNote
          source={hitbox.source}
          modified={modified.size > 0}
          onRestore={() => onFrameChange({ ...frame, hitboxes: frame.hitboxes.map((item) => (item.id === hitbox.id ? restoreWikiHitbox(item) : item)) }, null)}
        />
        <SliderField label="Radius" value={hitbox.radius} min={0.1} max={30} step={0.1} unit="u" modified={modified.has('radius')} onChange={(radius) => set({ radius }, 'radius')} />
        {HITBOX_NUMBER_FIELDS.map((field) => (
          <SliderField
            key={field.key}
            label={field.label}
            value={hitbox[field.key] as number}
            min={field.min}
            max={field.max}
            step={field.step}
            unit={field.unit}
            hint={field.key === 'angle' ? SPECIAL_HITBOX_ANGLES[hitbox.angle] : undefined}
            modified={field.key !== 'hitboxId' && modified.has(field.key)}
            onChange={(value) => set({ [field.key]: value }, field.key)}
          />
        ))}
        <SelectField label="Effect" value={hitbox.effect} options={HITBOX_EFFECTS} modified={modified.has('effect')} onChange={(effect) => set({ effect }, 'effect')} />
        <SelectField label="Attack type" value={hitbox.attackType} options={HITBOX_ATTACK_TYPES} modified={modified.has('attackType')} onChange={(attackType) => set({ attackType }, 'attackType')} />
        <SelectField label="Facing" value={hitbox.facing} options={HITBOX_FACING} modified={modified.has('facing')} onChange={(facing) => set({ facing }, 'facing')} />
        <SelectField label="Sound level" value={hitbox.soundLevel} options={HITBOX_SOUND_LEVELS} modified={modified.has('soundLevel')} onChange={(soundLevel) => set({ soundLevel }, 'soundLevel')} />
        <label className={`fe-text-field${modified.has('soundKind') ? ' is-modified' : ''}`}>
          Sound kind
          <input type="text" maxLength={60} value={hitbox.soundKind} onChange={(event) => set({ soundKind: event.currentTarget.value }, 'soundKind')} />
        </label>
        <div className="fe-toggle-grid">
          {HITBOX_BOOLEAN_FIELDS.map((field) => (
            <ToggleField
              key={field.key}
              label={field.label}
              checked={hitbox[field.key] as boolean}
              modified={modified.has(field.key)}
              onChange={(value) => set({ [field.key]: value }, field.key)}
            />
          ))}
        </div>
        {geometry}
        {remove}
      </PanelSection>
    );
  }

  // Multi-selection: group transform plus properties shared by every selected shape.
  const capsules = selection
    .filter((ref): ref is ShapeRef & { kind: CapsuleKind } => ref.kind !== 'point')
    .map((ref) => (frame[LIST_KEY[ref.kind]] as Capsule[]).find((item) => item.id === ref.id))
    .filter((item): item is Capsule => Boolean(item));
  const hurtboxIds = new Set(selection.filter((ref) => ref.kind === 'hurtbox').map((ref) => ref.id));
  const bounds = selectionBounds(frame, selection);
  const counts = selection.reduce<Record<string, number>>((acc, ref) => ({ ...acc, [ref.kind]: (acc[ref.kind] ?? 0) + 1 }), {});
  const group = (next: AnimationFrame, key: string | null = null) => onFrameChange(next, key);
  const averageRadius = capsules.length ? capsules.reduce((sum, item) => sum + item.radius, 0) / capsules.length : 0;

  return (
    <PanelSection title={`${selection.length} shapes`} kicker="GROUP" className="fe-inspector">
      <p className="fe-help">
        {Object.entries(counts).map(([kind, count]) => `${count} ${KIND_LABEL[kind] ?? kind}`).join(' · ')}
        {bounds && ` · bounds ${(bounds.maxX - bounds.minX).toFixed(1)} × ${(bounds.maxY - bounds.minY).toFixed(1)} u`}
      </p>
      <fieldset className="fe-fieldset">
        <legend>Move</legend>
        <div className="fe-nudge-pad">
          <button type="button" className="fe-button is-small" onClick={() => group(translateSelection(frame, selection, 0, nudgeStep), 'group-nudge')} aria-label="Move up">↑</button>
          <button type="button" className="fe-button is-small" onClick={() => group(translateSelection(frame, selection, -nudgeStep, 0), 'group-nudge')} aria-label="Move left">←</button>
          <button type="button" className="fe-button is-small" onClick={() => group(translateSelection(frame, selection, nudgeStep, 0), 'group-nudge')} aria-label="Move right">→</button>
          <button type="button" className="fe-button is-small" onClick={() => group(translateSelection(frame, selection, 0, -nudgeStep), 'group-nudge')} aria-label="Move down">↓</button>
        </div>
        <small className="fe-help">Arrow keys nudge {nudgeStep} u; Shift + arrow nudges {nudgeStep * 10} u.</small>
      </fieldset>
      <fieldset className="fe-fieldset">
        <legend>Transform</legend>
        <div className="fe-inline-actions">
          <button type="button" className="fe-button is-small" onClick={() => group(scaleSelection(frame, selection, 0.9))}>Scale 90%</button>
          <button type="button" className="fe-button is-small" onClick={() => group(scaleSelection(frame, selection, 1.1))}>Scale 110%</button>
          <button type="button" className="fe-button is-small" onClick={() => group(flipSelection(frame, selection))}>Flip horizontal</button>
        </div>
      </fieldset>
      {capsules.length > 0 && (
        <SliderField
          label={`Radius (all ${capsules.length})`}
          value={Math.round(averageRadius * 100) / 100}
          min={0.1}
          max={30}
          step={0.1}
          unit="u"
          hint={capsules.some((item) => item.radius !== capsules[0].radius) ? 'mixed' : undefined}
          onChange={(radius) => onFrameChange({
            ...frame,
            hurtboxes: frame.hurtboxes.map((item) => (selection.some((ref) => ref.kind === 'hurtbox' && ref.id === item.id) ? { ...item, radius } : item)),
            hitboxes: frame.hitboxes.map((item) => (selection.some((ref) => ref.kind === 'hitbox' && ref.id === item.id) ? { ...item, radius } : item)),
            grabboxes: frame.grabboxes.map((item) => (selection.some((ref) => ref.kind === 'grabbox' && ref.id === item.id) ? { ...item, radius } : item)),
          }, 'group-radius')}
        />
      )}
      {hurtboxIds.size > 0 && (
        <div className="fe-segmented" role="group" aria-label="Set state for selected hurtboxes">
          {HURTBOX_STATES.map((state) => (
            <button
              type="button"
              key={state}
              style={{ '--fe-state': HURTBOX_COLORS[state] } as CSSProperties}
              className={frame.hurtboxes.filter((item) => hurtboxIds.has(item.id)).every((item) => item.state === state) ? 'is-active' : ''}
              onClick={() => onFrameChange({
                ...frame,
                hurtboxes: frame.hurtboxes.map((item) => (hurtboxIds.has(item.id) ? { ...item, state } : item)),
              }, null)}
            >
              {state}
            </button>
          ))}
        </div>
      )}
      <button type="button" className="fe-button is-danger" onClick={() => { onFrameChange(deleteSelection(frame, selection), null); onSelectionChange([]); }}>
        Delete {selection.length} shapes
      </button>
    </PanelSection>
  );
}
