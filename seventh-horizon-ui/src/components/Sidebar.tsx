import React, { useMemo } from 'react';

interface SidebarProps {
  header: any[];
  popularTags: [string, number][];
  selectedTags: Set<string>;
  hiddenCols: Set<number>;
  runs: { name: string; path: string }[];
  csvPath: string;
  onToggleTag: (tag: string) => void;
  onToggleColumn: (colIdx: number) => void;
  onRunSelect: (path: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  header,
  popularTags,
  selectedTags,
  hiddenCols,
  runs,
  csvPath,
  onToggleTag,
  onToggleColumn,
  onRunSelect
}) => {
  // Normalize header to strings for display
  const headerLabels = useMemo(
    () => header.map((h, i) => (String(h ?? '').trim() || `Column ${i + 1}`)),
    [header]
  );

  return (
    <aside className="sidebar" data-test="sidebar" aria-label="Sidebar">
      {/* Runs chooser */}
      <section className="card" aria-labelledby="runs-header">
        <h3 id="runs-header" className="section-subheader">Runs</h3>
        {runs.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No runs discovered.</p>
        ) : (
          <select
            data-test="runs-select"
            value={csvPath}
            onChange={(e) => onRunSelect(e.target.value)}
            aria-label="Choose run"
            style={{ width: '100%' }}
          >
            {runs.map(r => (
              <option key={r.path} value={r.path}>{r.name || r.path}</option>
            ))}
          </select>
        )}
      </section>

      {/* Popular tags */}
      <section className="card" aria-labelledby="tags-header">
        <h3 id="tags-header" className="section-subheader">Popular tags</h3>
        {popularTags.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No tags found.</p>
        ) : (
          <ul className="tag-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {popularTags.map(([tag, count]) => {
              const active = selectedTags.has(tag);
              return (
                <li key={tag} style={{ marginBottom: 6 }}>
                  <button
                    type="button"
                    className={`pill ${active ? 'active' : ''}`}
                    data-test={`tag-${tag}`}
                    aria-pressed={active}
                    onClick={() => onToggleTag(tag)}
                    title={active ? 'Remove tag filter' : 'Add tag filter'}
                  >
                    {tag} &nbsp;
                    <span className="muted" aria-hidden>({count})</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Column visibility */}
      <section className="card" aria-labelledby="columns-header">
        <h3 id="columns-header" className="section-subheader">Columns</h3>
        {headerLabels.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No columns.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {headerLabels.map((label, idx) => {
              const hidden = hiddenCols.has(idx);
              return (
                <li key={idx} style={{ marginBottom: 4 }}>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={!hidden}
                      onChange={() => onToggleColumn(idx)}
                      aria-label={`Toggle column ${label}`}
                      data-test={`col-${idx}`}
                    />
                    <span>{label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </aside>
  );
};

export default Sidebar;
