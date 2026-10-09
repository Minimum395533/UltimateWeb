import { HITBOX_ATTACK_TYPES, HITBOX_EFFECTS, HITBOX_SOUND_LEVELS } from '../../types/frameData';
import type { ShapeDefaults } from '../../dev/frameDataModel';
import { DEFAULT_EDITOR_DEFAULTS } from './editorSettings';
import type { EditorDefaults } from './editorSettings';
import { PanelSection, SelectField, SliderField, ToggleField } from './fields';

export function DefaultsPanel({
  defaults,
  onChange,
}: {
  defaults: EditorDefaults;
  onChange: (defaults: EditorDefaults) => void;
}) {
  const setShapes = (patch: Partial<ShapeDefaults>) => onChange({ ...defaults, shapes: { ...defaults.shapes, ...patch } });
  const setHitbox = (patch: Partial<ShapeDefaults['hitbox']>) => setShapes({ hitbox: { ...defaults.shapes.hitbox, ...patch } });
  const { shapes } = defaults;
  return (
    <PanelSection
      title="Defaults"
      kicker="NEW SHAPES · THIS BROWSER"
      className="fe-defaults"
      actions={<button type="button" className="fe-link-button" onClick={() => onChange(DEFAULT_EDITOR_DEFAULTS)}>Reset</button>}
    >
      <fieldset className="fe-fieldset">
        <legend>Editing</legend>
        <ToggleField label="Snap drags to grid" checked={defaults.snapEnabled} onChange={(snapEnabled) => onChange({ ...defaults, snapEnabled })} />
        <SliderField label="Snap increment" value={defaults.snapIncrement} min={0.05} max={2} step={0.05} unit="u" onChange={(snapIncrement) => onChange({ ...defaults, snapIncrement })} />
        <SliderField label="Nudge step" value={defaults.nudgeStep} min={0.01} max={2} step={0.01} unit="u" onChange={(nudgeStep) => onChange({ ...defaults, nudgeStep })} />
      </fieldset>
      <fieldset className="fe-fieldset">
        <legend>Radii</legend>
        <SliderField label="Hurtbox" value={shapes.hurtboxRadius} min={0.1} max={30} step={0.1} unit="u" onChange={(hurtboxRadius) => setShapes({ hurtboxRadius })} />
        <SliderField label="Hitbox" value={shapes.hitboxRadius} min={0.1} max={30} step={0.1} unit="u" onChange={(hitboxRadius) => setShapes({ hitboxRadius })} />
        <SliderField label="Grab box" value={shapes.grabboxRadius} min={0.1} max={30} step={0.1} unit="u" onChange={(grabboxRadius) => setShapes({ grabboxRadius })} />
      </fieldset>
      <fieldset className="fe-fieldset">
        <legend>New custom hitbox</legend>
        <SliderField label="Damage" value={shapes.hitbox.damage} min={0} max={100} step={0.1} unit="%" onChange={(damage) => setHitbox({ damage })} />
        <SliderField label="Angle" value={shapes.hitbox.angle} min={0} max={368} step={1} unit="°" onChange={(angle) => setHitbox({ angle })} />
        <SliderField label="Base knockback" value={shapes.hitbox.baseKnockback} min={0} max={300} step={1} onChange={(baseKnockback) => setHitbox({ baseKnockback })} />
        <SliderField label="Knockback growth" value={shapes.hitbox.knockbackGrowth} min={0} max={300} step={1} onChange={(knockbackGrowth) => setHitbox({ knockbackGrowth })} />
        <SliderField label="Fixed knockback" value={shapes.hitbox.fixedKnockback} min={0} max={300} step={1} onChange={(fixedKnockback) => setHitbox({ fixedKnockback })} />
        <SliderField label="Shield damage" value={shapes.hitbox.shieldDamage} min={-50} max={100} step={1} onChange={(shieldDamage) => setHitbox({ shieldDamage })} />
        <SliderField label="Hitlag multiplier" value={shapes.hitbox.hitlagMultiplier} min={0} max={5} step={0.1} unit="×" onChange={(hitlagMultiplier) => setHitbox({ hitlagMultiplier })} />
        <SliderField label="SDI multiplier" value={shapes.hitbox.sdiMultiplier} min={0} max={5} step={0.1} unit="×" onChange={(sdiMultiplier) => setHitbox({ sdiMultiplier })} />
        <SelectField label="Effect" value={shapes.hitbox.effect} options={HITBOX_EFFECTS} onChange={(effect) => setHitbox({ effect })} />
        <SelectField label="Attack type" value={shapes.hitbox.attackType} options={HITBOX_ATTACK_TYPES} onChange={(attackType) => setHitbox({ attackType })} />
        <SelectField label="Sound level" value={shapes.hitbox.soundLevel} options={HITBOX_SOUND_LEVELS} onChange={(soundLevel) => setHitbox({ soundLevel })} />
        <div className="fe-toggle-grid">
          <ToggleField label="Hits grounded" checked={shapes.hitbox.hitsGrounded} onChange={(hitsGrounded) => setHitbox({ hitsGrounded })} />
          <ToggleField label="Hits aerial" checked={shapes.hitbox.hitsAerial} onChange={(hitsAerial) => setHitbox({ hitsAerial })} />
          <ToggleField label="Clang" checked={shapes.hitbox.clang} onChange={(clang) => setHitbox({ clang })} />
          <ToggleField label="Rebound" checked={shapes.hitbox.rebound} onChange={(rebound) => setHitbox({ rebound })} />
        </div>
      </fieldset>
    </PanelSection>
  );
}
