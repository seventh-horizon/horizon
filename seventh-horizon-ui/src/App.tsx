import React, { useReducer, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

// ✨ Components
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { Pager } from './components/Pager';
import { MiniCharts } from './components/MiniCharts';
import { ColumnChooserModal } from './components/ColumnChooserModal';

// ✨ Utilities
import { parseCSV, parseTags, rowsToCSV, isProbablyHTML } from './utils/csv';
import { saveTheme, saveUIState, copyToClipboard } from './utils/storage';
import { syncStateToURL, parseURLParams } from './utils/url';

type Theme = 'rose' | 'veil';

const REQUIRED_COLS: string[] = []; // Define or import this for schema checks
const MIN_COL_WIDTH = 50;
const ROW_HEIGHT = 30;

const initialState = {
  theme: 'rose' as Theme,
  csvPath: '',
  search: '',
  wrap: false,
  paging: true,
  pageSize: 50,
  page: 1,
  hiddenCols: new Set<number>(),
  columnOrder: [] as number[],
  selectedTags: new Set<string>(),
  sortKeys: [] as Array<{ idx: number; dir: 'asc' | 'desc' }>,
  refreshSec: 30,
  autoRefresh: false,
  colWidths: {} as Record<number, number>,
  rows: [] as any[][],
  loading: false,
  error: null as string | null,
  showColsModal: false,
  copied: null as string | null,
};

type State = typeof initialState;

type Action =
  | { type: 'SET_THEME' }
  | { type: 'SET_THEME_TO'; payload: Theme }
  | { type: 'SET_CSV_PATH'; payload: string }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'TOGGLE_WRAP' }
  | { type: 'SET_WRAP'; payload: boolean }
  | { type: 'SET_PAGING'; payload: boolean }
  | { type: 'SET_PAGE_SIZE'; payload: number }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_HIDDEN_COLS'; payload: Set<number> }
  | { type: 'SET_COLUMN_ORDER'; payload: number[] }
  | { type: 'SET_SELECTED_TAGS'; payload: Set<string> }
  | { type: 'TOGGLE_TAG'; payload: string }
  | { type: 'CLEAR_TAGS' }
  | { type: 'SET_SORT_KEYS'; payload: Array<{ idx: number; dir: 'asc' | 'desc' }> }
  | { type: 'SET_REFRESH_SEC'; payload: number }
  | { type: 'SET_AUTO_REFRESH'; payload: boolean }
  | { type: 'UPDATE_COL_WIDTH'; payload: { col: number; width: number } }
  | { type: 'SET_ROWS'; payload: any[][] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SHOW_COLS_MODAL'; payload: boolean }
  | { type: 'SET_COPIED'; payload: string | null }
  | { type: 'TOGGLE_COLUMN'; payload: number }
  | { type: 'RESET_COLUMNS' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, theme: state.theme === 'rose' ? 'veil' : 'rose' };
    case 'SET_THEME_TO':
      return { ...state, theme: action.payload };
    case 'SET_CSV_PATH':
      return { ...state, csvPath: action.payload };
    case 'SET_SEARCH':
      return { ...state, search: action.payload };
    case 'TOGGLE_WRAP':
      return { ...state, wrap: !state.wrap };
    case 'SET_WRAP':
      return { ...state, wrap: action.payload };
    case 'SET_PAGING':
      return { ...state, paging: action.payload };
    case 'SET_PAGE_SIZE':
      return { ...state, pageSize: action.payload };
    case 'SET_PAGE':
      return { ...state, page: action.payload };
    case 'SET_HIDDEN_COLS':
      return { ...state, hiddenCols: action.payload };
    case 'SET_COLUMN_ORDER':
      return { ...state, columnOrder: action.payload };
    case 'SET_SELECTED_TAGS':
      return { ...state, selectedTags: action.payload };
    case 'TOGGLE_TAG': {
      const tags = new Set(state.selectedTags);
      if (tags.has(action.payload)) tags.delete(action.payload);
      else tags.add(action.payload);
      return { ...state, selectedTags: tags };
    }
    case 'CLEAR_TAGS':
      return { ...state, selectedTags: new Set() };
    case 'SET_SORT_KEYS':
      return { ...state, sortKeys: action.payload };
    case 'SET_REFRESH_SEC':
      return { ...state, refreshSec: action.payload };
    case 'SET_AUTO_REFRESH':
      return { ...state, autoRefresh: action.payload };
    case 'UPDATE_COL_WIDTH':
      return { ...state, colWidths: { ...state.colWidths, [action.payload.col]: action.payload.width } };
    case 'SET_ROWS':
      return { ...state, rows: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_SHOW_COLS_MODAL':
      return { ...state, showColsModal: action.payload };
    case 'SET_COPIED':
      return { ...state, copied: action.payload };
    case 'TOGGLE_COLUMN': {
      const cols = new Set(state.hiddenCols);
      if (cols.has(action.payload)) cols.delete(action.payload);
      else cols.add(action.payload);
      return { ...state, hiddenCols: cols };
    }
    case 'RESET_COLUMNS':
      return { ...state, hiddenCols: new Set(), columnOrder: [] };
    default:
      return state;
  }
}

function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [schemaWarn, setSchemaWarn] = useState<string[]>([]);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewH, setViewH] = useState(400);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const resizing = useRef<{ col: number | null; startX: number; startW: number }>({ col: null, startX: 0, startW: 0 });
  const dragFrom = useRef<number | null>(null);

  // ✨ Theme effect - save to localStorage and DOM
  useEffect(() => {
    saveTheme(state.theme);
  }, [state.theme]);

  // ✨ Initialize from URL on mount
  useEffect(() => {
    const params = parseURLParams();

    if (params.csv) dispatch({ type: 'SET_CSV_PATH', payload: params.csv });
    if (params.theme === 'rose' || params.theme === 'veil') {
      dispatch({ type: 'SET_THEME_TO', payload: params.theme });
    }
    if (params.q) dispatch({ type: 'SET_SEARCH', payload: params.q });

    if (params.wrap === '1') dispatch({ type: 'SET_WRAP', payload: true });
    else if (params.wrap === '0') dispatch({ type: 'SET_WRAP', payload: false });

    if (params.refresh) {
      const n = Number(params.refresh);
      if (!isNaN(n) && n > 0) dispatch({ type: 'SET_REFRESH_SEC', payload: n });
    }

    if (params.hide) {
      const cols = params.hide.split('|').map(x => parseInt(x, 10)).filter(n => !isNaN(n));
      dispatch({ type: 'SET_HIDDEN_COLS', payload: new Set(cols) });
    }

    if (params.sort) {
      const keys = params.sort
        .split('|')
        .map(s => {
          const [i, d] = s.split(':');
          return { idx: parseInt(i, 10), dir: (d === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc' };
        })
        .filter(k => !isNaN(k.idx));
      if (keys.length) dispatch({ type: 'SET_SORT_KEYS', payload: keys });
    }

    if (params.pg) {
      const n = Number(params.pg);
      if (!isNaN(n) && n > 0) dispatch({ type: 'SET_PAGE', payload: n });
    }

    if (params.ps) {
      const n = Number(params.ps);
      if (!isNaN(n) && n > 0) dispatch({ type: 'SET_PAGE_SIZE', payload: n });
    }

    if (params.paging === '0') dispatch({ type: 'SET_PAGING', payload: false });
    else if (params.paging === '1') dispatch({ type: 'SET_PAGING', payload: true });

    if (params.order) {
      const arr = params.order.split('|').map(x => parseInt(x, 10)).filter(n => !isNaN(n));
      if (arr.length) dispatch({ type: 'SET_COLUMN_ORDER', payload: arr });
    }
  }, []);

  // ✨ Sync state to URL
  useEffect(() => {
    syncStateToURL({
      csvPath: state.csvPath,
      theme: state.theme,
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
      columnOrder: state.columnOrder,
    });
  }, [
    state.csvPath,
    state.theme,
    state.search,
    state.wrap,
    state.autoRefresh,
    state.refreshSec,
    state.selectedTags,
    state.hiddenCols,
    state.sortKeys,
    state.paging,
    state.page,
    state.pageSize,
    state.columnOrder,
  ]);

  // ✨ Persist state to localStorage
  useEffect(() => {
    saveUIState({
      csvPath: state.csvPath,
      search: state.search,
      wrap: state.wrap,
      paging: state.paging,
      pageSize: state.pageSize,
      page: state.page,
      hiddenCols: Array.from(state.hiddenCols),
      columnOrder: state.columnOrder,
      selectedTags: Array.from(state.selectedTags),
      sortKeys: state.sortKeys,
      refreshSec: state.refreshSec,
      autoRefresh: state.autoRefresh,
      colWidths: state.colWidths,
    });
  }, [
    state.csvPath,
    state.search,
    state.wrap,
    state.paging,
    state.pageSize,
    state.page,
    state.hiddenCols,
    state.columnOrder,
    state.selectedTags,
    state.sortKeys,
    state.refreshSec,
    state.autoRefresh,
    state.colWidths,
  ]);

  // ✨ Load CSV function
  const loadCsv = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const res = await fetch(state.csvPath, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const text = await res.text();
      const ctype = res.headers.get('content-type') || '';

      if (ctype && !/text\/csv|text\/plain|application\/octet-stream/i.test(ctype)) {
        if (isProbablyHTML(text)) {
          throw new Error(
            'Got HTML instead of CSV. Put your file under the Vite public/ folder (e.g. public/runs/latest/telemetry.csv) and load it via /runs/latest/telemetry.csv'
          );
        }
      }

      const parsed = parseCSV(text);

      if (parsed.length && state.rows.length === 0) {
        dispatch({ type: 'SET_HIDDEN_COLS', payload: new Set<number>() });
      }

      dispatch({ type: 'SET_ROWS', payload: parsed });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err?.message || String(err) });
      dispatch({ type: 'SET_ROWS', payload: [] });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (!state.autoRefresh) return;
    const id = setInterval(loadCsv, Math.max(5, state.refreshSec) * 1000);
    return () => clearInterval(id);
  }, [state.autoRefresh, state.refreshSec, state.csvPath]);

  // Column resizing effect
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (resizing.current.col == null) return;
      const dx = e.clientX - resizing.current.startX;
      const w = Math.max(MIN_COL_WIDTH, resizing.current.startW + dx);
      dispatch({
        type: 'UPDATE_COL_WIDTH',
        payload: { col: resizing.current.col as number, width: w },
      });
      document.body.classList.add('resizing');
    };

    const onUp = () => {
      resizing.current.col = null;
      document.body.classList.remove('resizing');
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // Keyboard shortcuts
  const header = useMemo(() => (state.rows.length ? state.rows[0] : []), [state.rows]);
  const body = useMemo(() => (state.rows.length > 1 ? state.rows.slice(1) : []), [state.rows]);

  // removed unused sortedBody variable

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const combo =
        (isMac && e.metaKey && e.key.toLowerCase() === 'k') ||
        (!isMac && e.ctrlKey && e.key.toLowerCase() === 'k');

      if (combo) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'f') {
        e.preventDefault();
        (document.querySelector('.search') as HTMLInputElement)?.focus();
      }
      if (e.key === 'r') {
        e.preventDefault();
        loadCsv();
      }
      if (e.key === '[') {
        e.preventDefault();
        dispatch({ type: 'SET_PAGE', payload: Math.max(1, state.page - 1) });
      }
      if (e.key === ']') {
        e.preventDefault();
        const totalPagesLocal = Math.max(
          1,
          Math.ceil(realSortedBody.length / Math.max(1, state.pageSize))
        );
        dispatch({ type: 'SET_PAGE', payload: Math.min(totalPagesLocal, state.page + 1) });
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.page, state.pageSize]);

  // Search
  const searchedBody = useMemo(() => {
    const q = state.search.trim().toLowerCase();
    if (!q) return body;
    return body.filter(r => r.some(c => (String(c ?? '')).toLowerCase().includes(q)));
  }, [body, state.search]);

  // Tags column
  const tagsCol = useMemo(
    () => header.findIndex(h => (String(h ?? '')).toLowerCase() === 'tags'),
    [header]
  );

  const popularTags = useMemo(() => {
    const m = new Map<string, number>();
    searchedBody.forEach(r => {
      const list = parseTags(tagsCol >= 0 ? r[tagsCol] : undefined);
      list.forEach(tag => m.set(tag, (m.get(tag) || 0) + 1));
    });
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
  }, [searchedBody, tagsCol]);

  // Filter by tags
  const filteredBody = useMemo(() => {
    if (!state.selectedTags.size || tagsCol < 0) return searchedBody;
    return searchedBody.filter(r => {
      const set = new Set(parseTags(r[tagsCol]));
      for (const t of state.selectedTags) if (!set.has(t)) return false;
      return true;
    });
  }, [searchedBody, state.selectedTags, tagsCol]);

  // Sort
  const realSortedBody = useMemo(() => {
    const out = [...filteredBody];
    const keys = state.sortKeys.length ? state.sortKeys : [{ idx: 0, dir: 'asc' as const }];

    out.sort((a, b) => {
      for (const { idx, dir } of keys) {
        const av = a[idx] ?? '';
        const bv = b[idx] ?? '';
        const an = Date.parse(String(av));
        const bn = Date.parse(String(bv));
        let cmp = 0;

        if (!isNaN(an) && !isNaN(bn)) {
          cmp = an - bn;
        } else if (!isNaN(Number(av)) && !isNaN(Number(bv))) {
          cmp = Number(av) - Number(bv);
        } else {
          cmp = String(av).localeCompare(String(bv));
        }

        if (cmp !== 0) return dir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });

    return out;
  }, [filteredBody, state.sortKeys]);

  // Update column order when header changes
  useEffect(() => {
    if (header.length && state.columnOrder.length !== header.length) {
      dispatch({
        type: 'SET_COLUMN_ORDER',
        payload: Array.from({ length: header.length }, (_, i) => i),
      });
    }

    // Check for missing required columns
    if (header.length) {
      const lower = header.map(h => String(h ?? '').toLowerCase());
      const missing = REQUIRED_COLS.filter(c => !lower.includes(c.toLowerCase()));
      setSchemaWarn(missing);
    } else {
      setSchemaWarn([]);
    }
  }, [header, state.columnOrder.length]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(realSortedBody.length / Math.max(1, state.pageSize)));

  useEffect(() => {
    if (state.page > totalPages) {
      dispatch({ type: 'SET_PAGE', payload: totalPages });
    }
  }, [totalPages, state.page]);

  const pagedBody = useMemo(() => {
    if (!state.paging) return realSortedBody;
    const startIdx = (Math.max(1, state.page) - 1) * Math.max(1, state.pageSize);
    return realSortedBody.slice(startIdx, startIdx + state.pageSize);
  }, [realSortedBody, state.paging, state.page, state.pageSize]);

  // Hour counts for chart
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

  // Virtualization
  useEffect(() => {
    const el = tableWrapRef.current;
    if (!el) return;
    const onResize = () => setViewH(el.clientHeight || 400);
    onResize();
    const ro = new ResizeObserver(onResize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 5);
  const visible = Math.ceil(viewH / ROW_HEIGHT) + 10;
  const end = Math.min(realSortedBody.length, start + visible);
  const topPad = start * ROW_HEIGHT;
  const bottomPad = Math.max(0, (realSortedBody.length - end) * ROW_HEIGHT);
  const visBody = realSortedBody.slice(start, end);

  // Event handlers
  const handleExportCSV = () => {
    const csv = rowsToCSV(header, realSortedBody);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'filtered.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyLink = async () => {
    const success = await copyToClipboard(window.location.href);
    if (success) {
      dispatch({ type: 'SET_COPIED', payload: 'Link copied' });
      setTimeout(() => dispatch({ type: 'SET_COPIED', payload: null }), 900);
    }
  };

  const handleUploadFile = async (file: File) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      dispatch({ type: 'SET_ROWS', payload: parsed });
    } catch (e: any) {
      dispatch({ type: 'SET_ERROR', payload: e?.message || String(e) });
      dispatch({ type: 'SET_ROWS', payload: [] });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleCopyCell = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      dispatch({ type: 'SET_COPIED', payload: 'Copied' });
      setTimeout(() => dispatch({ type: 'SET_COPIED', payload: null }), 900);
    }
  };

  const handleSortColumn = (colIdx: number, shiftKey: boolean) => {
    dispatch({
      type: 'SET_SORT_KEYS',
      payload: (() => {
        const prev = state.sortKeys;
        const found = prev.findIndex(k => k.idx === colIdx);

        if (!shiftKey) {
          if (found >= 0) {
            const dir = prev[found].dir === 'asc' ? 'desc' : 'asc';
            return [{ idx: colIdx, dir }];
          }
          return [{ idx: colIdx, dir: 'asc' as const }];
        }

        const next = [...prev];
        if (found >= 0) {
          next[found] = { idx: colIdx, dir: next[found].dir === 'asc' ? 'desc' : 'asc' };
        } else {
          next.push({ idx: colIdx, dir: 'asc' });
        }
        return next;
      })(),
    });
  };

  const displayColumnOrder: number[] = state.columnOrder.length
    ? state.columnOrder
    : header.length
    ? header.map((_, i) => i)
    : [0, 1, 2, 3, 4, 5, 6];

  const handleDragColumn = (fromIdx: number, toIdx: number) => {
    const current: number[] = state.columnOrder.length
      ? [...state.columnOrder]
      : header.length
      ? header.map((_, i) => i)
      : [];

    const fi = current.indexOf(fromIdx);
    const ti = current.indexOf(toIdx);

    if (fi < 0 || ti < 0 || fi === ti) return;

    current.splice(ti, 0, current.splice(fi, 1)[0]);
    dispatch({ type: 'SET_COLUMN_ORDER', payload: current });
  };

  return (
    <div className="layout">
      {/* ✨ Toolbar */}
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
        onThemeToggle={() => dispatch({ type: 'SET_THEME' })}
        onCsvPathChange={path => dispatch({ type: 'SET_CSV_PATH', payload: path })}
        onSearchChange={search => dispatch({ type: 'SET_SEARCH', payload: search })}
        onWrapToggle={() => dispatch({ type: 'TOGGLE_WRAP' })}
        onClearTags={() => dispatch({ type: 'CLEAR_TAGS' })}
        onExportCSV={handleExportCSV}
        onUploadClick={() => fileRef.current?.click()}
        onShowColumnsModal={() => dispatch({ type: 'SET_SHOW_COLS_MODAL', payload: true })}
        onCopyLink={handleCopyLink}
        onPagingChange={enabled => dispatch({ type: 'SET_PAGING', payload: enabled })}
        onPageSizeChange={size => dispatch({ type: 'SET_PAGE_SIZE', payload: size })}
        onAutoRefreshChange={enabled => dispatch({ type: 'SET_AUTO_REFRESH', payload: enabled })}
        onRefreshSecChange={seconds => dispatch({ type: 'SET_REFRESH_SEC', payload: seconds })}
        onReload={loadCsv}
      />

      <div
        className="layout"
        style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, marginTop: 16 }}
      >
        {/* ✨ Sidebar */}
        <Sidebar
          header={header}
          popularTags={popularTags}
          selectedTags={state.selectedTags}
          hiddenCols={state.hiddenCols}
          onToggleTag={tag => dispatch({ type: 'TOGGLE_TAG', payload: tag })}
          onToggleColumn={colIdx => dispatch({ type: 'TOGGLE_COLUMN', payload: colIdx })}
        />

        <section className={`card ${state.wrap ? 'wrap-on' : ''}`} style={{ padding: 16, borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Filtered Rows</h2>

          {state.error && (
            <div className="pill" role="alert" style={{ marginBottom: 12 }}>
              Error: {state.error}
            </div>
          )}

          {/* ✨ Pager */}
          <Pager
            paging={state.paging}
            page={state.page}
            totalPages={totalPages}
            totalRows={realSortedBody.length}
            onFirstPage={() => dispatch({ type: 'SET_PAGE', payload: 1 })}
            onPrevPage={() => dispatch({ type: 'SET_PAGE', payload: Math.max(1, state.page - 1) })}
            onNextPage={() => dispatch({ type: 'SET_PAGE', payload: Math.min(totalPages, state.page + 1) })}
            onLastPage={() => dispatch({ type: 'SET_PAGE', payload: totalPages })}
            onPageChange={page => dispatch({ type: 'SET_PAGE', payload: page })}
          />

          {schemaWarn.length > 0 && (
            <div className="validator" title="CSV schema hints" style={{ marginLeft: 8 }}>
              <b>CSV Validator:</b> Missing {schemaWarn.map(s => `"${s}"`).join(', ')} (synthesizing empty columns)
            </div>
          )}

          {/* ✨ MiniCharts */}
          <MiniCharts
            rowCount={state.paging ? pagedBody.length : realSortedBody.length}
            popularTags={popularTags}
            hourCounts={hourCounts}
          />

          {/* Table */}
          <div
            ref={tableWrapRef}
            className="table-wrap"
            style={{ overflow: 'auto' }}
            onScroll={e => setScrollTop((e.target as HTMLDivElement).scrollTop)}
          >
            <table className="table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  {displayColumnOrder.map(colIdx =>
                    state.hiddenCols.has(colIdx) ? null : (
                      <th
                        key={colIdx}
                        draggable
                        style={
                          {
                            ['--colw' as any]: state.colWidths[colIdx]
                              ? `${state.colWidths[colIdx]}px`
                              : undefined,
                          } as React.CSSProperties
                        }
                        onDragStart={() => {
                          dragFrom.current = colIdx;
                        }}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => {
                          if (dragFrom.current !== null && dragFrom.current !== colIdx) {
                            handleDragColumn(dragFrom.current, colIdx);
                          }
                          dragFrom.current = null;
                        }}
                        className={`col-${colIdx} sortable ${
                          state.sortKeys[0]?.idx === colIdx
                            ? state.sortKeys[0].dir === 'asc'
                              ? 'sort-asc'
                              : 'sort-desc'
                            : ''
                        }`}
                        onClick={e => handleSortColumn(colIdx, (e as React.MouseEvent).shiftKey)}
                      >
                        <div className="th-inner">
                          <span className="drag-handle">⋮⋮</span>
                          {header[colIdx] || '\u00A0'}
                        </div>
                        <span
                          className="resize-handle"
                          onMouseDown={e => {
                            e.preventDefault();
                            const th = (e.currentTarget as HTMLSpanElement).parentElement as HTMLTableCellElement;
                            const w = th.getBoundingClientRect().width;
                            resizing.current = { col: colIdx, startX: (e as React.MouseEvent).clientX, startW: w };
                          }}
                        />
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {(state.paging ? pagedBody : realSortedBody).length ? (
                  state.paging ? (
                    pagedBody.map((r, i) => (
                      <tr key={(state.page - 1) * state.pageSize + i}>
                        {displayColumnOrder.map(colIdx =>
                          state.hiddenCols.has(colIdx) ? null : (
                            <td
                              key={colIdx}
                              className={`col-${colIdx}`}
                              title={String(r[colIdx] ?? '')}
                              style={
                                {
                                  ['--colw' as any]: state.colWidths[colIdx]
                                    ? `${state.colWidths[colIdx]}px`
                                    : undefined,
                                } as React.CSSProperties
                              }
                            >
                              <span
                                onClick={() =>
                                  handleCopyCell(
                                    String(
                                      colIdx === tagsCol
                                        ? parseTags(r[colIdx]).join(' · ')
                                        : r[colIdx] ?? ''
                                    )
                                  )
                                }
                                style={{ cursor: 'copy' }}
                              >
                                {colIdx === tagsCol ? parseTags(r[colIdx]).join(' · ') : (r[colIdx] ?? '')}
                              </span>
                            </td>
                          )
                        )}
                      </tr>
                    ))
                  ) : (
                    <>
                      <tr className="spacer" style={{ height: topPad }} />
                      {visBody.map((r, i) => (
                        <tr key={start + i}>
                          {displayColumnOrder.map(colIdx =>
                            state.hiddenCols.has(colIdx) ? null : (
                              <td
                                key={colIdx}
                                className={`col-${colIdx}`}
                                title={String(r[colIdx] ?? '')}
                                style={
                                  {
                                    ['--colw' as any]: state.colWidths[colIdx]
                                      ? `${state.colWidths[colIdx]}px`
                                      : undefined,
                                  } as React.CSSProperties
                                }
                              >
                                <span
                                  onClick={() =>
                                    handleCopyCell(
                                      String(
                                        colIdx === tagsCol
                                          ? parseTags(r[colIdx]).join(' · ')
                                          : r[colIdx] ?? ''
                                      )
                                    )
                                  }
                                  style={{ cursor: 'copy' }}
                                >
                                  {colIdx === tagsCol ? parseTags(r[colIdx]).join(' · ') : (r[colIdx] ?? '')}
                                </span>
                              </td>
                            )
                          )}
                        </tr>
                      ))}
                      <tr className="spacer" style={{ height: bottomPad }} />
                    </>
                  )
                ) : (
                  <tr>
                    <td colSpan={Math.max(7, header.length || 7)} style={{ opacity: 0.7, padding: '12px 8px' }}>
                      No data loaded
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ✨ Column chooser */}
      <ColumnChooserModal
        show={state.showColsModal}
        header={header}
        columnOrder={state.columnOrder}
        hiddenCols={state.hiddenCols}
        onClose={() => dispatch({ type: 'SET_SHOW_COLS_MODAL', payload: false })}
        onToggleColumn={colIdx => dispatch({ type: 'TOGGLE_COLUMN', payload: colIdx })}
        onReset={() => dispatch({ type: 'RESET_COLUMNS' })}
      />

      {/* Copy feedback */}
      {state.copied && (
        <div className="copied-tip" role="status" aria-live="polite">
          {state.copied}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) {
            handleUploadFile(file);
            e.currentTarget.value = '';
          }
        }}
      />

      <footer className="status" style={{ marginTop: 16, opacity: 0.8, fontSize: 12 }}>
        Theme: <code>{state.theme}</code>
      </footer>
    </div>
  );
}

export default App;