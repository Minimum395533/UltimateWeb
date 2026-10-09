import { useId } from 'react';
import type { ReactNode } from 'react';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** A numeric property: slider plus exact number field. */
export function SliderField({
  label,
  value,
  min,
  max,
  step = 0.1,
  unit,
  modified = false,
  hint,
  disabled = false,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  /** Marks a value that differs from its SmashWiki source. */
  modified?: boolean;
  hint?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const commit = (raw: string) => {
    if (raw.trim() === '') return;
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) onChange(clamp(parsed, min, max));
  };
  return (
    <div className={`fe-slider${modified ? ' is-modified' : ''}`}>
      <label className="fe-slider-label" htmlFor={id}>
        <span>{label}</span>
        {modified && <em title="Differs from the SmashWiki value">edited</em>}
        {hint && <small>{hint}</small>}
      </label>
      <input
        aria-label={`${label} slider`}
        className="fe-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamp(value, min, max)}
        disabled={disabled}
        onChange={(event) => commit(event.currentTarget.value)}
      />
      <span className="fe-number-wrap">
        <input
          id={id}
          className="fe-number"
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? Number(value.toFixed(4)) : 0}
          disabled={disabled}
          onChange={(event) => commit(event.currentTarget.value)}
        />
        {unit && <small>{unit}</small>}
      </span>
    </div>
  );
}

export function ToggleField({
  label,
  checked,
  modified = false,
  disabled = false,
  onChange,
}: {
  label: string;
  checked: boolean;
  modified?: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={`fe-toggle${modified ? ' is-modified' : ''}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.currentTarget.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function SelectField({
  label,
  value,
  options,
  modified = false,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  modified?: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const list = options.includes(value) ? options : [value, ...options];
  return (
    <div className={`fe-select-field${modified ? ' is-modified' : ''}`}>
      <label htmlFor={id}>{label}{modified && <em>edited</em>}</label>
      <select id={id} className="fe-select" value={value} onChange={(event) => onChange(event.currentTarget.value)}>
        {list.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

export function PanelSection({
  title,
  kicker,
  actions,
  children,
  className = '',
}: {
  title: string;
  kicker?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`fe-panel ${className}`}>
      <header className="fe-panel-head">
        <div>
          {kicker && <span className="fe-kicker">{kicker}</span>}
          <h2>{title}</h2>
        </div>
        {actions && <div className="fe-panel-actions">{actions}</div>}
      </header>
      {children}
    </section>
  );
}
