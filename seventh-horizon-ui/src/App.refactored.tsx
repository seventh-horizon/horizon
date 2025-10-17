import { useRef, useEffect, useMemo, useCallback, useState } from 'react';

import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { MiniCharts } from './components/MiniCharts';
import { Pager } from './components/Pager';
import { ColumnChooserModal } from './components/ColumnChooserModal';
import { DataTable } from './components/DataTable';
import { CommandPalette } from './components/CommandPalette';

import { parseCSV, parseTags, rowsToCSV } from './utils/csv';
import { saveTheme } from './utils/storage';
import { syncStateToURL, toPublicUrl } from './utils/url';
import type { SortKey } from './types';

import './App.css';
import { useTableState } from './hooks/useTableState';

function AppRefactored() {
  const [state, dispatch] = useTableState();
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [runs, setRuns] = useState<{ name: string; path: string }[]>([]);

  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch runs and determine initial CSV path (cancellation-safe)
  useEffect(() => {
    let cancelled = false;

    const initializeRuns = async () => {
      let initialPath: string | null = import.meta.env.VITE_DEFAULT_CSV || null;

      try {
        const res = await fetch(toPublicUrl('.last-run.json'));
        if (!cancelled && res.ok) {
          const lastRun = await res.json();
          if (lastRun?.path) initialPath = lastRun.path;
        }
      } catch {
        /* ignore */
      }

      try {
        const res = await fetch(toPublicUrl('runs.json'));
        if (!cancelled && res.ok) {
          const runsData: { name: string; path: string }[] = await res.json();
          setRuns(runsData);
          if (!initialPath && runsData.length > 0) {
            initialPath = runsData[0].path;
          }
        }
      } catch {
        /* ignore */
      }

      if (!cancelled && initialPath && !state.csvPath) {
        dispatch({ type: 'SET_CSV_PATH', payload: initialPath });
      }
    };

    initializeRuns();
    return () => {
      cancelled = true;
    };
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme persistence + apply data-theme to <html>
  useEffect(() => {
    saveTheme(state.theme);
    document.documentElement.setAttribute('data-theme', state.theme || 'rose');
  }, [state.theme]);

  // URL synchronization — only safe fields
  useEffect(() => {
    syncStateToURL({
      theme: state.theme,
      csvPath: state.csvPath,
      search: state.search,
      wrap: state.wrap,
      autoRefresh: state.autoRefresh,
      refreshSec: state.refreshSec,
      selectedTags: state.selectedTags,
      hiddenCols: state.hiddenCols,
      sortKeys: state.sortKeys,
      paging: state.paging,
      page: state.page,
      pageSize: state.pageSize,
      columnOrder: state.columnOrder
    });
  }, [state]);

  // Load CSV for current csvPath
  const loadCsv = useCallback(async () => {
    const path = state.csvPath;
    if (!path) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const url = toPublicUrl(path);
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const text = await res.text();
      const parsed = parseCSV(text);
      dispatch({ type: 'SET_ROWS', payload: parsed });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err?.message || String(err) });
      dispatch({ type: 'SET_ROWS', payload: [] });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.csvPath, dispatch]);

  // Load when csvPath changes
  useEffect(() => {
    if (state.csvPath) loadCsv();
  }, [loadCsv, state.csvPath]);

  // Auto-refresh
  useEffect(() => {
    if (!state.autoRefresh) return;
    const id = setInterval(loadCsv, Math.max(5, state.refreshSec) * 1000);
    return () => clearInterval(id);
  }, [state.autoRefresh, state.refreshSec, loadCsv]);

  // Cmd/Ctrl + K: toggle command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ---------- Derived Data ----------
  const header = useMemo(() => (state.rows.length ? state.rows[0] : []), [state.rows]);
  const body = useMemo(() => (state.rows.length > 1 ? state.rows.slice(1) : []), [state.rows]);

  const searchedBody = useMemo(() => {
    const q = state.search.trim().toLowerCase();
    if (!q) return body;
    return body.filter(row => row.some(cell => String(cell ?? '').toLowerCase().includes(q)));
  }, [body, state.search]);

  const tagsCol = useMemo(
    () => header.findIndex(h => String(h ?? '').toLowerCase() === 'tags'),
    [header]
  );

  const popularTags = useMemo(() => {
    if (tagsCol < 0) return [];
    const counts = new Map<string, number>();
    for (const row of searchedBody) {
      const list = parseTags(row[tagsCol]);
      for (const tag of list) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [searchedBody, tagsCol]);

  const filteredBody = useMemo(() => {
    if (!state.selectedTags.size || tagsCol < 0) return searchedBody;
    return searchedBody.filter(row => {
      const set = new Set(parseTags(row[tagsCol]));
      for (const t of state.selectedTags) if (!set.has(t)) return false;
      return true;
    });
  }, [searchedBody, state.selectedTags, tagsCol]);

  const sortedBody = useMemo(() => {
    if (state.sortKeys.length === 0) return filteredBody;
    const out = [...filteredBody];
    out.sort((a, b) => {
      for (const { idx, dir } of state.sortKeys) {
        const av = a[idx] ?? '';
        const bv = b[idx] ?? '';
        const an = Date.parse(String(av));
        const bn = Date.parse(String(bv));
        let cmp = 0;
        if (!Number.isNaN(an) && !Number.isNaN(bn)) cmp = an - bn;
        else if (!Number.isNaN(Number(av)) && !Number.isNaN(Number(bv))) cmp = Number(av) - Number(bv);
        else cmp = String(av).localeCompare(String(bv));
        if (cmp !== 0) return dir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
    return out;
  }, [filteredBody, state.sortKeys]);

  const totalPages = Math.max(1, Math.ceil(sortedBody.length / Math.max(1, state.pageSize)));
  const pagedBody = useMemo(() => {
    if (!state.paging) return sortedBody;
    const startIdx = (Math.max(1, state.page) - 1) * Math.max(1, state.pageSize);
    return sortedBody.slice(startIdx, startIdx + state.pageSize);
  }, [sortedBody, state.paging, state.page, state.pageSize]);

  const hourCounts = useMemo(() => {
    const idxUTC = header.findIndex(h => String(h ?? '').toLowerCase() === 'utc');
    if (idxUTC < 0) return new Array(24).fill(0);
    const arr = new Array(24).fill(0);
    for (const row of filteredBody) {
      const v = row[idxUTC];
      const d = v ? new Date(String(v)) : null;
      if (d && !Number.isNaN(d.getTime())) arr[d.getUTCHours()]++;
    }
    return arr;
  }, [filteredBody, header]);

  // ---------- Handlers ----------
  const handleSort = useCallback(
    (colIdx: number) => {
      const existing = state.sortKeys.find(k => k.idx === colIdx);
      let next: SortKey[];
      if (!existing) next = [{ idx: colIdx, dir: 'asc' }];
      else if (existing.dir === 'asc') next = [{ idx: colIdx, dir: 'desc' }];
      else next = []; // clear sort on third click
      dispatch({ type: 'SET_SORT_KEYS', payload: next });
    },
    [state.sortKeys, dispatch]
  );

  const handleColumnOrderChange = useCallback(
    (newOrder: number[]) => dispatch({ type: 'SET_COLUMN_ORDER', payload: newOrder }),
    [dispatch]
  );

  const handleExportCSV = useCallback(() => {
    const rows = state.paging ? pagedBody : sortedBody;
    const csv = rowsToCSV(header, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'filtered.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [header, sortedBody, pagedBody, state.paging]);

  const handleCopyLink = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
      } else {
        const input = document.createElement('input');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        input.value = window.location.href;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      dispatch({ type: 'SET_COPIED', payload: 'Link copied' });
    } catch {
      dispatch({ type: 'SET_COPIED', payload: 'Copy failed' });
    } finally {
      setTimeout(() => dispatch({ type: 'SET_COPIED', payload: null }), 1200);
    }
  }, [dispatch]);

  const handleFileUpload = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = ev => {
        const text = ev.target?.result;
        if (typeof text === 'string') {
          try {
            const parsed = parseCSV(text);
            dispatch({ type: 'SET_ROWS', payload: parsed });
            dispatch({ type: 'SET_ERROR', payload: null });
          } catch (err: any) {
            dispatch({
              type: 'SET_ERROR',
              payload: 'Failed to parse CSV: ' + (err?.message || String(err))
            });
          }
        }
      };
      reader.readAsText(file);
    },
    [dispatch]
  );

  const handleCsvPathChange = useCallback(
    (path: string) => dispatch({ type: 'SET_CSV_PATH', payload: path }),
    [dispatch]
  );

  const handleApplyFilter = useCallback(
    (f: { tag?: string; runId?: string }) => {
      if (f.tag) dispatch({ type: 'TOGGLE_TAG', payload: f.tag });
      if (f.runId) {
        const run = runs.find(r => r.name === f.runId || r.path === f.runId);
        if (run) dispatch({ type: 'SET_CSV_PATH', payload: run.path });
      }
    },
    [dispatch, runs]
  );

  const handleThemeToggle = useCallback(() => dispatch({ type: 'SET_THEME' }), [dispatch]);

  return (
    <main className="layout" role="main">
      <Toolbar
        theme={state.theme}
        csvPath={state.csvPath}
        search={state.search}
        wrap={state.wrap}
        paging={state.paging}
        pageSize={state.pageSize}
        autoRefresh={state.autoRefresh}
        refreshSec={state.refreshSec}
        loading={state.loading}
        selectedTagsSize={state.selectedTags.size}
        onThemeToggle={handleThemeToggle}
        onCsvPathChange={handleCsvPathChange}
        onSearchChange={(s) => dispatch({ type: 'SET_SEARCH', payload: s })}
        onWrapToggle={() => dispatch({ type: 'TOGGLE_WRAP' })}
        onClearTags={() => dispatch({ type: 'CLEAR_TAGS' })}
        onExportCSV={handleExportCSV}
        onUploadClick={() => fileRef.current?.click()}
        onShowColumnsModal={() => dispatch({ type: 'SET_SHOW_COLS_MODAL', payload: true })}
        onCopyLink={handleCopyLink}
        onPagingChange={(e) => dispatch({ type: 'SET_PAGING', payload: e })}
        onPageSizeChange={(n) => dispatch({ type: 'SET_PAGE_SIZE', payload: n })}
        onAutoRefreshChange={(e) => dispatch({ type: 'SET_AUTO_REFRESH', payload: e })}
        onRefreshSecChange={(n) => dispatch({ type: 'SET_REFRESH_SEC', payload: n })}
        onReload={loadCsv}
      />

      <div className="layout-main">
        <Sidebar
          header={header}
          popularTags={popularTags}
          selectedTags={state.selectedTags}
          hiddenCols={state.hiddenCols}
          runs={runs}
          csvPath={state.csvPath}
          onToggleTag={(t) => dispatch({ type: 'TOGGLE_TAG', payload: t })}
          onToggleColumn={(i) => dispatch({ type: 'TOGGLE_COLUMN', payload: i })}
          onRunSelect={handleCsvPathChange}
        />

        <section
          className={`card ${state.wrap ? 'wrap-on' : ''}`}
          aria-labelledby="filtered-section-header"
          role="region"
        >
          <h2 id="filtered-section-header" className="section-header">
            Filtered Rows
          </h2>

          {state.loading && (
            <div className="pill" role="status" aria-live="assertive">
              Loading…
            </div>
          )}

          {state.error && (
            <div className="pill error" role="alert" aria-live="assertive">
              {state.error}
              <button style={{ marginLeft: 8 }} onClick={loadCsv}>Reload</button>
            </div>
          )}

          {!state.loading && !state.error && header.length === 0 && (
            <div className="pill" role="status" aria-live="polite">
              No data loaded. Pick a run in the sidebar or set VITE_DEFAULT_CSV.
            </div>
          )}

          {header.length > 0 && (
            <>
              <Pager
                paging={state.paging}
                page={state.page}
                totalPages={totalPages}
                totalRows={sortedBody.length}
                onFirstPage={() => dispatch({ type: 'SET_PAGE', payload: 1 })}
                onPrevPage={() =>
                  dispatch({ type: 'SET_PAGE', payload: Math.max(1, state.page - 1) })
                }
                onNextPage={() =>
                  dispatch({
                    type: 'SET_PAGE',
                    payload: Math.min(totalPages, state.page + 1)
                  })
                }
                onLastPage={() => dispatch({ type: 'SET_PAGE', payload: totalPages })}
                onPageChange={(p) => dispatch({ type: 'SET_PAGE', payload: p })}
              />

              <MiniCharts
                rowCount={pagedBody.length}
                popularTags={popularTags}
                hourCounts={hourCounts}
              />

              <DataTable
                header={header}
                body={pagedBody}
                hiddenCols={state.hiddenCols}
                columnOrder={state.columnOrder}
                sortKeys={state.sortKeys}
                onSort={handleSort}
              />
            </>
          )}
        </section>
      </div>

      <ColumnChooserModal
        {...state}
        header={header}
        onClose={() => dispatch({ type: 'SET_SHOW_COLS_MODAL', payload: false })}
        onToggleColumn={(i) => dispatch({ type: 'TOGGLE_COLUMN', payload: i })}
        onOrderChange={handleColumnOrderChange}
        onReset={() => dispatch({ type: 'RESET_COLUMNS' })}
      />

      {state.copied && (
        <div className="copied-tip" role="status" aria-live="polite">
          {state.copied}
        </div>
      )}

      <CommandPalette
        open={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        tags={popularTags.map(([t]) => t)}
        runs={runs.map(r => r.name)}
        applyFilter={handleApplyFilter}
      />

      <input
        ref={fileRef}
        type="file"
        name="csv-upload"
        id="csv-upload"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) {
            handleFileUpload(file);
            e.currentTarget.value = '';
          }
        }}
      />
    </main>
  );
}

export default AppRefactored;