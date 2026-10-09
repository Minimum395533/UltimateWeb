import { useRef } from 'react';
import type { ReferenceAssetMetadata, ReferenceSettings } from '../../types/frameData';
import { PanelSection, SliderField, ToggleField } from './fields';
import type { ReferenceMedia } from './useReferenceMedia';

const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';

export function ReferencePanel({
  assets,
  activeAssetId,
  settings,
  media,
  linkedFrame,
  frameNumber,
  busy,
  onUpload,
  onSelectAsset,
  onDeleteAsset,
  onSettingsChange,
  onLinkFrame,
  onAutoLink,
}: {
  assets: ReferenceAssetMetadata[];
  activeAssetId: string | null;
  settings: ReferenceSettings;
  media: ReferenceMedia;
  /** The reference frame linked to the current editor frame. */
  linkedFrame: number | null;
  frameNumber: number;
  busy: boolean;
  onUpload: (file: File) => void;
  onSelectAsset: (assetId: string | null) => void;
  onDeleteAsset: (assetId: string) => void;
  onSettingsChange: (patch: Partial<ReferenceSettings>, historyKey?: string) => void;
  onLinkFrame: (referenceFrame: number | null) => void;
  onAutoLink: (mode: 'one-to-one' | 'stretch') => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const active = assets.find((asset) => asset.id === activeAssetId) ?? null;
  const animated = media.frameCount > 1;

  return (
    <PanelSection
      title="Reference"
      kicker="PER ANIMATION"
      className="fe-reference-panel"
      actions={(
        <>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            hidden
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = '';
              if (file) onUpload(file);
            }}
          />
          <button type="button" className="fe-button is-small" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? 'Uploading…' : 'Upload'}
          </button>
        </>
      )}
    >
      {assets.length > 0 ? (
        <label className="fe-select-field">
          <span>Image ({assets.length} uploaded)</span>
          <select
            className="fe-select"
            value={activeAssetId ?? ''}
            onChange={(event) => onSelectAsset(event.currentTarget.value || null)}
          >
            <option value="">None</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.fileName} · {new Date(asset.createdAt).toLocaleDateString()}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="fe-help">PNG, JPEG, WebP, or GIF up to 10 MB. Animated GIF and WebP can be stepped frame by frame. Uploading saves this animation first.</p>
      )}
      {media.loading && <p className="fe-help">Loading reference…</p>}
      {media.error && <p className="fe-error" role="alert">{media.error}</p>}

      {active && (
        <>
          <SliderField label="Opacity" value={settings.opacity} min={0} max={1} step={0.05} onChange={(opacity) => onSettingsChange({ opacity }, 'ref-opacity')} />
          <SliderField label="Scale" value={settings.scale} min={0.2} max={3} step={0.01} unit="×" disabled={settings.locked} onChange={(scale) => onSettingsChange({ scale }, 'ref-scale')} />
          <SliderField label="Offset X" value={settings.offsetX} min={-20} max={20} step={0.1} unit="u" disabled={settings.locked} onChange={(offsetX) => onSettingsChange({ offsetX }, 'ref-offset-x')} />
          <SliderField label="Offset Y" value={settings.offsetY} min={-20} max={20} step={0.1} unit="u" disabled={settings.locked} onChange={(offsetY) => onSettingsChange({ offsetY }, 'ref-offset-y')} />
          <div className="fe-toggle-grid">
            <ToggleField label="Lock alignment" checked={settings.locked} onChange={(locked) => onSettingsChange({ locked })} />
            {animated && <ToggleField label="Link frames" checked={settings.linkFrames} onChange={(linkFrames) => onSettingsChange({ linkFrames })} />}
          </div>
          {!settings.locked && <p className="fe-help">Unlocked: drag the image in the viewport, or use the sliders.</p>}

          {animated && (
            <fieldset className="fe-fieldset">
              <legend>{media.format} · frame {media.frameIndex + 1} / {media.frameCount}</legend>
              {settings.linkFrames && linkedFrame !== null ? (
                <p className="fe-help">Editor frame {frameNumber} shows reference frame {linkedFrame + 1}.</p>
              ) : (
                <div className="fe-inline-actions">
                  <button type="button" className="fe-button is-small" onClick={() => media.step(-1)} aria-label="Previous reference frame">◀</button>
                  <button type="button" className="fe-button is-small" onClick={() => media.setPlaying(!media.playing)}>{media.playing ? 'Pause' : 'Play'}</button>
                  <button type="button" className="fe-button is-small" onClick={() => media.step(1)} aria-label="Next reference frame">▶</button>
                </div>
              )}
              {settings.linkFrames && (
                <>
                  <SliderField
                    label={`Frame ${frameNumber} → ref`}
                    value={(linkedFrame ?? media.frameIndex) + 1}
                    min={1}
                    max={media.frameCount}
                    step={1}
                    onChange={(value) => onLinkFrame(value - 1)}
                  />
                  <div className="fe-inline-actions">
                    <button type="button" className="fe-button is-small" onClick={() => onLinkFrame(null)} disabled={linkedFrame === null}>Unlink frame</button>
                    <button type="button" className="fe-button is-small" onClick={() => onAutoLink('one-to-one')} title="Editor frame N shows reference frame N">Auto-link 1:1</button>
                    <button type="button" className="fe-button is-small" onClick={() => onAutoLink('stretch')} title="Spread reference frames evenly across the animation">Auto-link stretched</button>
                  </div>
                </>
              )}
            </fieldset>
          )}
          <button
            type="button"
            className="fe-link-button is-danger"
            onClick={() => {
              if (window.confirm(`Delete ${active.fileName}? This cannot be undone.`)) onDeleteAsset(active.id);
            }}
          >
            Delete this upload
          </button>
        </>
      )}
    </PanelSection>
  );
}
