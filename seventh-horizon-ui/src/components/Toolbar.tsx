import { forwardRef } from 'react';
import type { Theme } from '../types';

interface ToolbarProps {
  theme: Theme;
  csvPath: string;
  search: string;
  wrap: boolean;
  paging: boolean;
  pageSize: number;
  autoRefresh: boolean;
  refreshSec: number;
  loading: boolean;
  selectedTagsSize: number;
  onThemeToggle: () => void;
  onCsvPathChange: (path: string) => void;
  onSearchChange: (search: string) => void;
  onWrapToggle: () => void;
  onClearTags: () => void;
  onExportCSV: () => void;
  onUploadClick: () => void;
  onShowColumnsModal: () => void;
  onCopyLink: () => void;
  onPagingChange: (enabled: boolean) => void;
  onPageSizeChange: (size: number) => void;
  onAutoRefreshChange: (enabled: boolean) => void;
  onRefreshSecChange: (seconds: number) => void;
  onReload: () => void;

  /** ✅ NEW: used by Playwright tests to open the drawer */
  onOpenDrawer: () => void;
}

export const Toolbar = forwardRef<HTMLInputElement, ToolbarProps>(({
  theme, csvPath, search, wrap, paging, pageSize, autoRefresh, refreshSec, loading, selectedTagsSize,
  onThemeToggle, onCsvPathChange, onSearchChange, onWrapToggle, onClearTags, onExportCSV,
  onUploadClick, onShowColumnsModal, onCopyLink, onPagingChange, onPageSizeChange,
  onAutoRefreshChange, onRefreshSecChange, onReload,
  onOpenDrawer, // ✅ NEW
}, ref) => {
  return (
    <header className="toolbar header">
      <div className="toolbar-main">
        <div className="toolbar-group">
          <label htmlFor="csvPath" className="sr-only">CSV Path</label>
          <input
            ref={ref}
            id="csvPath"
            name="csvPath"
            className="input"
            placeholder="CSV path…"
            value={csvPath}
            onChange={(e) => onCsvPathChange(e.target.value)}
            type="text"
            autoComplete="off"
            spellCheck={false}
          />
          <label htmlFor="search" className="sr-only">Search</label>
          <input
            id="search"
            name="search"
            className="search"
            placeholder="Search all columns…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            type="search"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
          />
          <button
            className="pill"
            type="button"
            data-test="open-drawer"
            aria-controls="app-drawer"
            onClick={onOpenDrawer}
            title="Open filters drawer"
          >
            Filters
          </button>
        </div>

        <div className="toolbar-group">
          <button className="pill" onClick={onWrapToggle}>{wrap ? '↔ No Wrap' : '↩ Wrap Cells'}</button>
          <button className="pill" onClick={onClearTags} disabled={selectedTagsSize === 0}>Clear Tags</button>

          {/* ✅ NEW: Filters button with the test hook Playwright expects */}
          <button
            className="pill"
            type="button"
            data-test="open-drawer"
            aria-controls="app-drawer"
            onClick={onOpenDrawer}
            title="Open filters drawer"
          >
            Filters
          </button>
        </div>

        <div className="toolbar-group">
          <button className="pill" onClick={onExportCSV}>⬇ Export CSV</button>
          <button className="pill" onClick={onUploadClick}>⬆ Upload CSV</button>
        </div>
      </div>

      <div className="toolbar-secondary">
        <div className="toolbar-group">
          <button className="pill" onClick={onShowColumnsModal}>☰ Columns…</button>
          <button className="pill" onClick={onCopyLink}>🔗 Copy link</button>
          <span className="pill switch">
            <input
              type="checkbox"
              id="paging-toggle"
              name="paging-toggle"
              checked={paging}
              onChange={(e) => onPagingChange(e.target.checked)}
            />
            <label htmlFor="paging-toggle">Paging</label>
            <select
              name="pageSize"
              id="pageSize"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Page size"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
          </span>
          <span className="pill switch">
            <input
              type="checkbox"
              id="auto-refresh-toggle"
              name="auto-refresh-toggle"
              checked={autoRefresh}
              onChange={(e) => onAutoRefreshChange(e.target.checked)}
            />
            <label htmlFor="auto-refresh-toggle">Auto-refresh</label>
            <input
              type="number"
              id="refresh-seconds"
              name="refresh-seconds"
              min={5}
              step={5}
              inputMode="numeric"
              value={refreshSec}
              onChange={(e) => onRefreshSecChange(Number(e.target.value) || 15)}
              title="seconds"
              aria-label="Refresh seconds"
            />
          </span>
        </div>
        <div className="toolbar-group">
          <button className="pill" onClick={onThemeToggle}>{theme === 'rose' ? '🌫 Veil' : '🌸 Rose'}</button>
          <button className="pill" onClick={onReload} disabled={loading}>{loading ? 'Loading…' : '⟳ Reload'}</button>
        </div>
      </div>
    </header>
  );
});