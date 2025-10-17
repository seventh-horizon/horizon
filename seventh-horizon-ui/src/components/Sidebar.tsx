import type { Row } from '../types';

interface SidebarProps {
  header: string[];
  popularTags: [string, number][];
  selectedTags: Set<string>;
  hiddenCols: Set<number>;
  runs: { name: string; path: string }[];
  csvPath: string;
  onToggleTag: (tag: string) => void;
  onToggleColumn: (colIdx: number) => void;
  onRunSelect: (path: string) => void;
}

export function Sidebar({
  header,
  popularTags,
  selectedTags,
  hiddenCols,
  runs,
  csvPath,
  onToggleTag,
  onToggleColumn,
  onRunSelect,
}: SidebarProps) {
  return (
    <aside className="card sidebar" aria-label="Sidebar controls">
      <h3 className="sidebar-header">Runs</h3>
      <div className="menu">
        {runs.length > 0 ? (
          runs.map(run => {
            const isActive = run.path === csvPath;
            return (
              <button
                key={run.path}
                type="button"
                className={`menu-item ${isActive ? 'active' : ''}`}
                onClick={() => onRunSelect(run.path)}
                aria-current={isActive ? 'page' : undefined}
              >
                {run.name}
              </button>
            );
          })
        ) : (
          <div className="menu-item-placeholder">No runs found</div>
        )}
      </div>

      <h3 className="sidebar-header">Popular Tags</h3>
      <div className="chips">
        {popularTags.length ? (
          popularTags.map(([tag, count]) => {
            const active = selectedTags.has(tag);
            return (
              <button
                key={tag}
                type="button"
                className={`chip ${active ? 'active' : ''}`}
                onClick={() => onToggleTag(tag)}
                aria-pressed={active}
              >
                {tag}
                <span className="count" aria-label={`${count} rows`}>{count}</span>
              </button>
            );
          })
        ) : (
          <div className="menu-item-placeholder">—</div>
        )}
      </div>

      <h3 className="sidebar-header">Columns</h3>
      <div className="menu">
        {header.map((h, i) => {
          const id = `col-toggle-${i}`;
          return (
            <label htmlFor={id} key={i} className="menu-item">
              <input
                type="checkbox"
                id={id}
                name={id}
                checked={!hiddenCols.has(i)}
                onChange={() => onToggleColumn(i)}
              />
              {h || `Column ${i + 1}`}
            </label>
          );
        })}
      </div>
    </aside>
  );
}
