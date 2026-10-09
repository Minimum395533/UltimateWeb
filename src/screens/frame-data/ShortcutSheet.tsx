import { useEffect, useRef } from 'react';

export const SHORTCUTS: readonly { group: string; items: readonly [string, string][] }[] = [
  {
    group: 'Timeline',
    items: [
      [', / .', 'Previous / next frame'],
      ['← / →', 'Previous / next frame (nothing selected)'],
      ['Home / End', 'First / last frame'],
      ['Space', 'Play / pause at 60 fps'],
      ['Shift + click timeline', 'Select a frame range'],
    ],
  },
  {
    group: 'Shapes',
    items: [
      ['H / B / G', 'Add hurtbox / hitbox / grab box'],
      ['V / P', 'Select tool / silhouette pen'],
      ['Shift + click', 'Add or remove from selection'],
      ['Drag empty space', 'Box select'],
      ['Ctrl + A', 'Select all editable shapes'],
      ['Arrows', 'Nudge selection (Shift = ×10)'],
      ['Delete', 'Delete selection'],
      ['Ctrl + D', 'Duplicate selection'],
      ['Esc', 'Clear selection and range'],
    ],
  },
  {
    group: 'Clipboard & history',
    items: [
      ['Ctrl + C', 'Copy selection, or the frame range / current frame'],
      ['Ctrl + V', 'Paste (works across frames and animations)'],
      ['Ctrl + Shift + V', 'Paste shapes into every frame in the range'],
      ['I', 'Interpolate between the first and last frame of the range'],
      ['Ctrl + Z', 'Undo'],
      ['Ctrl + Shift + Z / Ctrl + Y', 'Redo'],
      ['Ctrl + S', 'Save'],
    ],
  },
  {
    group: 'View',
    items: [
      ['Scroll', 'Zoom around the cursor'],
      ['Alt / middle / right drag', 'Pan'],
      ['F', 'Fit to shapes'],
      ['0', 'Reset view'],
      ['O', 'Toggle onion skin'],
      ['L', 'Lock / unlock reference'],
      ['?', 'Show this sheet'],
    ],
  },
];

export function ShortcutSheet({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === '?') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handle, true);
    return () => window.removeEventListener('keydown', handle, true);
  }, [onClose]);
  return (
    <div className="fe-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="fe-modal" role="dialog" aria-modal="true" aria-labelledby="fe-shortcuts-title" onClick={(event) => event.stopPropagation()}>
        <header className="fe-panel-head">
          <div>
            <span className="fe-kicker">KEYBOARD</span>
            <h2 id="fe-shortcuts-title">Shortcuts</h2>
          </div>
          <button ref={closeRef} type="button" className="fe-button is-small" onClick={onClose}>Close</button>
        </header>
        <div className="fe-shortcut-grid">
          {SHORTCUTS.map((section) => (
            <section key={section.group}>
              <h3>{section.group}</h3>
              <dl>
                {section.items.map(([keys, action]) => (
                  <div key={keys}>
                    <dt><kbd>{keys}</kbd></dt>
                    <dd>{action}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
        <p className="fe-help">On macOS, Cmd works wherever Ctrl is listed.</p>
      </div>
    </div>
  );
}
