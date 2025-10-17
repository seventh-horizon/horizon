import { useRef, useEffect, useMemo, useCallback } from 'react';
import type React from 'react';
import { Toolbar, Sidebar, MiniCharts, Pager, ColumnChooserModal, DataTable } from './components';
import { parseCSV, parseTags, rowsToCSV } from './utils/csv';
import { saveTheme, copyToClipboard } from './utils/storage';
import { syncStateToURL } from './utils/url';
import './App.css';
import './themes/signal-rose.css';
import './themes/signal-veil.css';
import { useTableState } from './hooks/useTableState';

function AppRefactored() {
  const [state, dispatch] = useTableState();

  if (!state) {
    return <div>Initializing...</div>;
  }

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state.csvPath && import.meta.env.VITE_DEFAULT_CSV) {
      dispatch({ type: 'SET_CSV_PATH', payload: import.meta.env.VITE_DEFAULT_CSV });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    saveTheme(state.theme);
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);

  useEffect(() => {
    syncStateToURL(state);
  }, [state]);

  const loadCsv = useCallback(async () => {
    if (!state.csvPath && !import.meta.env.VITE_DEFAULT_CSV) return;
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      const path = state.csvPath || import.meta.env.VITE_DEFAULT_CSV;
      const publicUrl = `${import.meta.env.BASE_URL}${path.startsWith('/') ? path.slice(1) : path}`;
      const res = await fetch(publicUrl, { cache: 'no-store' });
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

  useEffect(() => { loadCsv(); }, [loadCsv]);

  useEffect(() => {
    if (!state.autoRefresh) return;
    const id = setInterval(loadCsv, Math.max(5, state.refreshSec) * 1000);
    return () => clearInterval(id);
  }, [state.autoRefresh, state.refreshSec, loadCsv]);

  // Computed values
  const header = useMemo(() => (state.rows.length ? state.rows[0] : []), [state.rows]);
  const body = useMemo(() => (state.rows.length > 1 ? state.rows.slice(1) : []), [state.rows]);
  const searchedBody = useMemo(() => {
    const q = state.search.trim().toLowerCase();
    if (!q) return body;
    return body.filter(r => r.some(c => String(c ?? '').toLowerCase().includes(q)));
  }, [body, state.search]);
  const tagsCol = useMemo(() => header.findIndex(h => String(h ?? '').toLowerCase() === 'tags'), [header]);
  const popularTags = useMemo(() => {
    const m = new Map<string, number>();
    searchedBody.forEach(r => {
      const list = parseTags(tagsCol >= 0 ? r[tagsCol] : undefined);
      list.forEach(tag => m.set(tag, (m.get(tag) || 0) + 1));
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [searchedBody, tagsCol]);
  const filteredBody = useMemo(() => {
    if (!state.selectedTags.size || tagsCol < 0) return searchedBody;
    return searchedBody.filter(r => {
      const rowTags = new Set(parseTags(r[tagsCol]));
      for (const t of state.selectedTags) if (!rowTags.has(t)) return false;
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
        if (!isNaN(an) && !isNaN(bn)) cmp = an - bn;
        else if (!isNaN(Number(av)) && !isNaN(Number(bv))) cmp = Number(av) - Number(bv);
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
    const arr = new Array(24).fill(0);
    filteredBody.forEach(r => {
      const t = idxUTC >= 0 ? r[idxUTC] : undefined;
      const d = t ? new Date(String(t)) : null;
      if (d && !isNaN(d.getTime())) arr[d.getUTCHours()]++;
    });
    return arr;
  }, [filteredBody, header]);

  // Event Handlers
  const handleSort = useCallback((colIdx: number) => { dispatch({ type: 'TOGGLE_SORT', payload: colIdx }); }, [dispatch]);
  const handleColumnOrderChange = useCallback((newOrder: number[]) => { dispatch({ type: 'SET_COLUMN_ORDER', payload: newOrder }); }, [dispatch]);
  const handleExportCSV = useCallback(() => {
    const csv = rowsToCSV(header, sortedBody);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'filtered_telemetry.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [header, sortedBody]);
  const handleCopyLink = useCallback(async () => {
    if (await copyToClipboard(window.location.href)) {
      dispatch({ type: 'SET_COPIED', payload: 'Link copied!' });
      setTimeout(() => dispatch({ type: 'SET_COPIED', payload: null }), 1200);
    }
  }, [dispatch]);
  const handleThemeToggle = useCallback(() => { dispatch({ type: 'SET_THEME', payload: state.theme === 'rose' ? 'veil' : 'rose' }); }, [state.theme, dispatch]);
  const handleWrapToggle = useCallback(() => dispatch({ type: 'TOGGLE_WRAP' }), [dispatch]);
  const handleClearTags = useCallback(() => dispatch({ type: 'CLEAR_TAGS' }), [dispatch]);
  const handleShowColumnsModal = useCallback(() => dispatch({ type: 'SET_SHOW_COLS_MODAL', payload: true }), [dispatch]);
  const handlePagingChange = useCallback((enabled: boolean) => dispatch({ type: 'SET_PAGING', payload: enabled }), [dispatch]);
  const handlePageSizeChange = useCallback((size: number) => dispatch({ type: 'SET_PAGE_SIZE', payload: size }), [dispatch]);
  const handleAutoRefreshChange = useCallback((enabled: boolean) => dispatch({ type: 'SET_AUTO_REFRESH', payload: enabled }), [dispatch]);
  const handleRefreshSecChange = useCallback((seconds: number) => dispatch({ type: 'SET_REFRESH_SEC', payload: seconds }), [dispatch]);
  const handleToggleTag = useCallback((tag: string) => { dispatch({ type: 'TOGGLE_TAG', payload: tag }) }, [dispatch]);
  const handleToggleColumn = useCallback((colIdx: number) => dispatch({ type: 'TOGGLE_COLUMN', payload: colIdx }), [dispatch]);
  const handleFirstPage = useCallback(() => dispatch({ type: 'SET_PAGE', payload: 1 }), [dispatch]);
  const handlePrevPage = useCallback(() => dispatch({ type: 'SET_PAGE', payload: Math.max(1, state.page - 1) }), [state.page, dispatch]);
  const handleNextPage = useCallback(() => dispatch({ type: 'SET_PAGE', payload: Math.min(totalPages, state.page + 1) }), [state.page, totalPages, dispatch]);
  const handleLastPage = useCallback(() => dispatch({ type: 'SET_PAGE', payload: totalPages }), [totalPages, dispatch]);
  const handlePageChange = useCallback((page: number) => dispatch({ type: 'SET_PAGE', payload: page }), [dispatch]);
  const handleCloseColsModal = useCallback(() => dispatch({ type: 'SET_SHOW_COLS_MODAL', payload: false }), [dispatch]);
  const handleResetCols = useCallback(() => dispatch({ type: 'RESET_COLUMNS' }), [dispatch]);
  const handleCsvPathChange = useCallback((path: string) => { dispatch({ type: 'SET_CSV_PATH', payload: path }) }, [dispatch]);
  const handleSearchChange = useCallback((search: string) => { dispatch({ type: 'SET_SEARCH', payload: search }) }, [dispatch]);
  const handleFileUpload = useCallback((file: File) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCSV(text);
        dispatch({ type: 'SET_ROWS', payload: parsed });
        dispatch({ type: 'SET_CSV_PATH', payload: file.name });
      } catch (err: any) {
        dispatch({ type: 'SET_ERROR', payload: `Failed to parse ${file.name}: ${err.message}` });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    reader.onerror = () => {
      dispatch({ type: 'SET_ERROR', payload: `Failed to read ${file.name}` });
      dispatch({ type: 'SET_LOADING', payload: false });
    };
    reader.readAsText(file);
  }, [dispatch]);

  return (
    <div className="layout">
      <Toolbar {...state} onThemeToggle={handleThemeToggle} onCsvPathChange={handleCsvPathChange} onSearchChange={handleSearchChange} onWrapToggle={handleWrapToggle} onClearTags={handleClearTags} onExportCSV={handleExportCSV} onUploadClick={() => fileRef.current?.click()} onShowColumnsModal={handleShowColumnsModal} onCopyLink={handleCopyLink} onPagingChange={handlePagingChange} onPageSizeChange={handlePageSizeChange} onAutoRefreshChange={handleAutoRefreshChange} onRefreshSecChange={handleRefreshSecChange} onReload={loadCsv} selectedTagsSize={state.selectedTags.size} />
      <div className="layout" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, marginTop: 16 }}>
        <Sidebar header={header} popularTags={popularTags} selectedTags={state.selectedTags} hiddenCols={state.hiddenCols} onToggleTag={handleToggleTag} onToggleColumn={handleToggleColumn} />
        <section className={`card ${state.wrap ? 'wrap-on' : ''}`} style={{ padding: 16, borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Filtered Rows</h2>
          {state.error && <div className="pill" role="alert">{state.error}</div>}
          <Pager {...state} totalRows={sortedBody.length} totalPages={totalPages} onFirstPage={handleFirstPage} onPrevPage={handlePrevPage} onNextPage={handleNextPage} onLastPage={handleLastPage} onPageChange={handlePageChange} />
          <MiniCharts rowCount={pagedBody.length} popularTags={popularTags} hourCounts={hourCounts} />
          <DataTable
            header={header}
            body={pagedBody}
            hiddenCols={state.hiddenCols}
            columnOrder={state.columnOrder}
            sortKeys={state.sortKeys}
            onSort={handleSort}
          />
        </section>
      </div>
      <ColumnChooserModal {...state} header={header} onClose={handleCloseColsModal} onToggleColumn={handleToggleColumn} onOrderChange={handleColumnOrderChange} onReset={handleResetCols} />
      {state.copied && <div className="copied-tip">{state.copied}</div>}
      <input ref={fileRef} type="file" name="csv-upload" id="csv-upload" accept=".csv,text/csv" style={{ display: 'none' }} onChange={e => {
        const file = e.target.files?.[0];
        if (file) { handleFileUpload(file); e.currentTarget.value = ''; }
      }} />
    </div>
  );
}

export default AppRefactored;