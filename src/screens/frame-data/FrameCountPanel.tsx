import { useEffect, useState } from 'react';
import type { AnimationCatalogEntry } from '../../data/falcon/animationCatalog';
import { MAX_ANIMATION_FRAMES } from '../../dev/frameDataModel';
import { PanelSection } from './fields';

export function FrameCountPanel({
  entry,
  frameCount,
  confirmedCount,
  extraFrames,
  busy,
  onConfirm,
  onClear,
  onTrimExtra,
}: {
  entry: AnimationCatalogEntry;
  frameCount: number;
  /** Count the user confirmed in the editor, if any. */
  confirmedCount: number | null;
  /** Frames past the locked count in a stored draft. */
  extraFrames: number;
  busy: boolean;
  onConfirm: (count: number) => void;
  onClear: () => void;
  onTrimExtra: () => void;
}) {
  const [value, setValue] = useState(String(frameCount));
  useEffect(() => setValue(String(frameCount)), [frameCount, entry.id]);
  const parsed = Number(value);
  const valid = Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= MAX_ANIMATION_FRAMES;
  const confirmed = confirmedCount !== null || entry.count.confirmed;
  const sourceLabel = confirmedCount !== null
    ? `Confirmed by you${confirmedCount !== entry.frameCount ? ` (catalog says ${entry.frameCount})` : ''}`
    : `${entry.count.source}${entry.count.confirmed ? '' : ' · not confirmed'}`;

  return (
    <PanelSection title="Frame count" kicker={confirmed ? 'LOCKED' : 'NEEDS CONFIRMATION'} className={`fe-count-panel${confirmed ? '' : ' is-unconfirmed'}`}>
      <p className="fe-count-big"><strong>{frameCount}</strong> frames · {(frameCount / 60).toFixed(2)}s</p>
      <p className="fe-help">
        {sourceLabel}. {entry.count.note}{' '}
        {entry.count.url && <a href={entry.count.url} target="_blank" rel="noreferrer">Source</a>}
      </p>
      {extraFrames > 0 && (
        <div className="fe-warning" role="alert">
          The saved draft has {extraFrames} frame{extraFrames === 1 ? '' : 's'} past frame {frameCount}. Nothing was removed.
          Trim them, or confirm {frameCount + extraFrames} frames.
          <div className="fe-inline-actions">
            <button type="button" className="fe-button is-small is-danger" onClick={onTrimExtra}>Trim to {frameCount}</button>
            <button type="button" className="fe-button is-small" disabled={busy} onClick={() => onConfirm(frameCount + extraFrames)}>Confirm {frameCount + extraFrames}</button>
          </div>
        </div>
      )}
      <form
        className="fe-count-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) onConfirm(parsed);
        }}
      >
        <label>
          Count
          <input type="number" min={1} max={MAX_ANIMATION_FRAMES} step={1} value={value} onChange={(event) => setValue(event.currentTarget.value)} />
        </label>
        <button type="submit" className="fe-button is-small" disabled={!valid || busy || (parsed === frameCount && confirmedCount === frameCount)}>
          {parsed === frameCount ? 'Confirm count' : `Change to ${valid ? parsed : '…'}`}
        </button>
        {confirmedCount !== null && (
          <button type="button" className="fe-link-button" disabled={busy} onClick={onClear}>Use catalog count</button>
        )}
      </form>
    </PanelSection>
  );
}
