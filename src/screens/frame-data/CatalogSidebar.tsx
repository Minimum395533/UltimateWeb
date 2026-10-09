import { useMemo, useState } from 'react';
import { ANIMATION_CATALOG, ANIMATION_GROUPS } from '../../data/falcon/animationCatalog';

export type AnimationStatus = 'default' | 'saved' | 'unsaved' | 'approved' | 'approved-changed';

export const STATUS_LABEL: Record<AnimationStatus, string> = {
  default: 'Default',
  saved: 'Saved',
  unsaved: 'Unsaved',
  approved: 'Approved',
  'approved-changed': 'Changed since approval',
};

export function CatalogSidebar({
  selectedId,
  statuses,
  frameCounts,
  countConfirmed,
  onSelect,
}: {
  selectedId: string;
  statuses: Record<string, AnimationStatus>;
  frameCounts: Record<string, number>;
  countConfirmed: Record<string, boolean>;
  onSelect: (animationId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? ANIMATION_CATALOG.filter((entry) => entry.label.toLowerCase().includes(needle) || entry.id.includes(needle))
      : ANIMATION_CATALOG;
  }, [query]);
  const totals = useMemo(() => {
    const counts = { approved: 0, saved: 0, unsaved: 0 };
    for (const entry of ANIMATION_CATALOG) {
      const status = statuses[entry.id];
      if (status === 'approved') counts.approved += 1;
      else if (status === 'unsaved') counts.unsaved += 1;
      else if (status === 'saved' || status === 'approved-changed') counts.saved += 1;
    }
    return counts;
  }, [statuses]);

  return (
    <aside className="fe-catalog" aria-label="Captain Falcon animations">
      <div className="fe-catalog-head">
        <span className="fe-kicker">CAPTAIN FALCON</span>
        <h2>Animations <span className="fe-count">{ANIMATION_CATALOG.length}</span></h2>
        <p className="fe-catalog-totals">
          <span className="is-approved">{totals.approved} approved</span>
          <span className="is-saved">{totals.saved} saved</span>
          {totals.unsaved > 0 && <span className="is-unsaved">{totals.unsaved} unsaved</span>}
        </p>
        <input
          className="fe-search"
          type="search"
          placeholder="Filter animations…"
          aria-label="Filter animations"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
      </div>
      <nav className="fe-catalog-list">
        {ANIMATION_GROUPS.map((group) => {
          const items = filtered.filter((entry) => entry.group === group.id);
          if (!items.length) return null;
          const isCollapsed = collapsed[group.id] && !query;
          return (
            <div className="fe-catalog-group" key={group.id}>
              <button
                type="button"
                className="fe-catalog-group-head"
                aria-expanded={!isCollapsed}
                onClick={() => setCollapsed((current) => ({ ...current, [group.id]: !current[group.id] }))}
              >
                <span>{isCollapsed ? '▸' : '▾'} {group.label}</span>
                <small>{items.length}</small>
              </button>
              {!isCollapsed && items.map((entry) => {
                const status = statuses[entry.id] ?? 'default';
                return (
                  <button
                    type="button"
                    key={entry.id}
                    className={`fe-catalog-item${entry.id === selectedId ? ' is-active' : ''}`}
                    aria-current={entry.id === selectedId ? 'true' : undefined}
                    onClick={() => onSelect(entry.id)}
                  >
                    <span className={`fe-status-dot is-${status}`} title={STATUS_LABEL[status]} aria-hidden="true" />
                    <span className="fe-catalog-label">{entry.label}</span>
                    <span className={`fe-catalog-frames${countConfirmed[entry.id] ? '' : ' is-unconfirmed'}`} title={countConfirmed[entry.id] ? 'Confirmed frame count' : 'Frame count not confirmed yet'}>
                      {frameCounts[entry.id] ?? entry.frameCount}f{countConfirmed[entry.id] ? '' : '?'}
                    </span>
                    <span className="fe-visually-hidden">, {STATUS_LABEL[status]}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
        {!filtered.length && <p className="fe-empty-note">No animation matches “{query}”.</p>}
      </nav>
    </aside>
  );
}
