import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

type Theme = 'rose' | 'veil';
const readInitialTheme = (): Theme => {
  const saved = localStorage.getItem('hz.theme');
  if (saved === 'rose' || saved === 'veil') return saved as Theme;
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'veil' : 'rose';
};

// Very small CSV parser (handles commas inside quotes)
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = []; let cell = '';
  let q = false; // in quotes
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { q = false; }
      else { cell += c; }
    } else {
      if (c === '"') q = true;
      else if (c === ',') { cur.push(cell); cell = ''; }
      else if (c === '\n') { cur.push(cell); rows.push(cur); cur = []; cell = ''; }
      else if (c === '\r') { /* ignore */ }
      else { cell += c; }
    }
  }
  if (cell.length || cur.length) { cur.push(cell); rows.push(cur); }
  return rows.filter(r => r.length && !(r.length === 1 && r[0] === ''));
}

function App() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);
  const [csvPath, setCsvPath] = useState<string>('/runs/latest/telemetry.csv');
  const [rows, setRows] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const rowHeight = 42; // px, approximate row height for virtualization



  // const [sortIdx, setSortIdx] = useState<number>(0);
  // const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [wrap, setWrap] = useState<boolean>(false);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [hiddenCols, setHiddenCols] = useState<Set<number>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [refreshSec, setRefreshSec] = useState<number>(15);
  const fileRef = useRef<HTMLInputElement>(null);

  // Paging & URL persistence
  const [paging, setPaging] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Column order (drag & drop)
  const [columnOrder, setColumnOrder] = useState<number[]>([]);
  const dragFrom = useRef<number | null>(null);

  // Column chooser modal
  const [showColsModal, setShowColsModal] = useState<boolean>(false);

  // Drawer state for filters sidebar
  const [drawerOpen, setDrawerOpen] = useState<boolean>(true);

  // Schema warnings
  const REQUIRED_COLS = ['RunID', 'UTC', 'Tags', 'CWD', 'GitBranch', 'GitCommit', 'Python'];
  const [schemaWarn, setSchemaWarn] = useState<string[]>([]);

  // Local persistence
  const LS = { THEME: 'hz.theme', UI: 'hz.ui' } as const;
  type UIStatePersist = {
    csvPath?: string; search?: string; wrap?: boolean; paging?: boolean; pageSize?: number; page?: number;
    hiddenCols?: number[]; columnOrder?: number[]; selectedTags?: string[]; sortKeys?: { idx: number; dir: 'asc' | 'desc' }[]; refreshSec?: number; autoRefresh?: boolean;
    colWidths?: Record<number, number>;
  };

  // Column widths (for future use or resizing)
  const [colWidths, setColWidths] = useState<Record<number, number>>({});
  const resizing = useRef<{ col: number | null; startX: number; startW: number }>({ col: null, startX: 0, startW: 0 });

  // Copy feedback
  const [copied, setCopied] = useState<string | null>(null);
  const copyCell = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied('Copied'); setTimeout(()=>setCopied(null), 900); } catch {}
  };
  const [search, setSearch] = useState<string>('');
  type SortKey = { idx: number; dir: 'asc' | 'desc'; };
  const [sortKeys, setSortKeys] = useState<SortKey[]>([{ idx: 0, dir: 'asc' }]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('hz.theme', theme);
  }, [theme]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const csv = p.get('csv');
    if (csv) setCsvPath(csv);
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get('theme');
    if (t === 'rose' || t === 'veil') setTheme(t);
    const q = p.get('q'); if (q) setSearch(q);
    const w = p.get('wrap'); if (w === '1') setWrap(true);
    const rt = p.get('refresh'); if (rt) { const n = Number(rt); if (!isNaN(n) && n > 0) { setRefreshSec(n); setAutoRefresh(true); } }
    const tags = p.get('tags'); if (tags) setSelectedTags(new Set(tags.split(';').filter(Boolean)));
    const hide = p.get('hide'); if (hide) setHiddenCols(new Set(hide.split('|').map(x => parseInt(x, 10)).filter(n => !isNaN(n))));
    const sort = p.get('sort');
    if (sort) {
      const keys = sort.split('|').map(s => { const [i, d] = s.split(':'); return { idx: parseInt(i, 10), dir: (d === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc' }; }).filter(k => !isNaN(k.idx));
      if (keys.length) setSortKeys(keys);
    }
    const pg = p.get('pg'); if (pg) { const n = Number(pg); if (!isNaN(n) && n > 0) setPage(n); }
    const ps = p.get('ps'); if (ps) { const n = Number(ps); if (!isNaN(n) && n > 0) setPageSize(n); }
    const pgOn = p.get('paging'); if (pgOn === '0') setPaging(false); else if (pgOn === '1') setPaging(true);
    const order = p.get('order');
    if (order) {
      const arr = order.split('|').map(x => parseInt(x, 10)).filter(n => !isNaN(n));
      if (arr.length) setColumnOrder(arr);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS.UI);
      if (!raw) return;
      const urlp = new URLSearchParams(window.location.search);
      const u = JSON.parse(raw) as UIStatePersist;
      if (u.csvPath && !urlp.get('csv')) setCsvPath(u.csvPath);
      if (u.search && !urlp.get('q')) setSearch(u.search);
      if (typeof u.wrap === 'boolean' && !urlp.get('wrap')) setWrap(u.wrap);
      if (typeof u.paging === 'boolean' && !urlp.get('paging')) setPaging(u.paging);
      if (typeof u.pageSize === 'number' && !urlp.get('ps')) setPageSize(u.pageSize);
      if (typeof u.page === 'number' && !urlp.get('pg')) setPage(u.page);
      if (Array.isArray(u.hiddenCols) && !urlp.get('hide')) setHiddenCols(new Set(u.hiddenCols));
      if (Array.isArray(u.columnOrder) && !urlp.get('order')) setColumnOrder(u.columnOrder);
      if (Array.isArray(u.selectedTags) && !urlp.get('tags')) setSelectedTags(new Set(u.selectedTags));
      if (Array.isArray(u.sortKeys) && !urlp.get('sort')) setSortKeys(u.sortKeys as any);
      if (typeof u.refreshSec === 'number' && !urlp.get('refresh')) setRefreshSec(u.refreshSec);
      if (typeof u.autoRefresh === 'boolean') setAutoRefresh(u.autoRefresh);
      if (u.colWidths) setColWidths(u.colWidths);
    } catch {}
  }, []);

  const syncUrl = useMemo(() => {
    const build = () => {
      const p = new URLSearchParams();
      if (csvPath) p.set('csv', csvPath);
      if (theme) p.set('theme', theme);
      if (search) p.set('q', search);
      if (wrap) p.set('wrap', '1');
      if (autoRefresh) p.set('refresh', String(refreshSec));
      if (selectedTags.size) p.set('tags', Array.from(selectedTags).join(';'));
      if (hiddenCols.size) p.set('hide', Array.from(hiddenCols).sort((a, b) => a - b).join('|'));
      if (sortKeys.length) p.set('sort', sortKeys.map(k => `${k.idx}:${k.dir}`).join('|'));
      if (!paging) p.set('paging', '0'); else p.set('paging', '1');
      if (page > 1) p.set('pg', String(page));
      if (pageSize !== 50) p.set('ps', String(pageSize));
      if (columnOrder.length) p.set('order', columnOrder.join('|'));
      const url = `${window.location.pathname}?${p.toString()}`;
      return () => window.history.replaceState(null, '', url);
    };
    return { update: build };
  }, [csvPath, theme, search, wrap, autoRefresh, refreshSec, selectedTags, hiddenCols, sortKeys, paging, page, pageSize, columnOrder]);

  useEffect(() => { syncUrl.update()(); }, [syncUrl]);

  useEffect(() => {
    const u: UIStatePersist = {
      csvPath, search, wrap, paging, pageSize, page,
      hiddenCols: Array.from(hiddenCols), columnOrder,
      selectedTags: Array.from(selectedTags), sortKeys, refreshSec, autoRefresh,
      colWidths
    };
    localStorage.setItem(LS.UI, JSON.stringify(u));
  }, [csvPath, search, wrap, paging, pageSize, page, hiddenCols, columnOrder, selectedTags, sortKeys, refreshSec, autoRefresh, colWidths]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(loadCsv, Math.max(5, refreshSec) * 1000);
    return () => clearInterval(id);
  }, [autoRefresh, refreshSec, csvPath]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (resizing.current.col == null) return;
      const dx = e.clientX - resizing.current.startX;
      const w = Math.max(64, resizing.current.startW + dx);
      setColWidths(prev => ({ ...prev, [resizing.current.col as number]: w }));
      document.body.classList.add('resizing');
    };
    const onUp = () => { resizing.current.col = null; document.body.classList.remove('resizing'); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  // ⌘K / Ctrl+K focuses the CSV input (mini command palette)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const combo = (isMac && e.metaKey && e.key.toLowerCase() === 'k') || (!isMac && e.ctrlKey && e.key.toLowerCase() === 'k');
      if (combo) { e.preventDefault(); inputRef.current?.focus(); }
      if (e.key === 'f') { e.preventDefault(); (document.querySelector('.search') as HTMLInputElement)?.focus(); }
      if (e.key === 'r') { e.preventDefault(); loadCsv(); }
      if (e.key === '[') { e.preventDefault(); setPage(p=>Math.max(1,p-1)); }
      if (e.key === ']') { e.preventDefault(); setPage(p=>Math.min(totalPages,p+1)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  // Paging & URL persistence
  // (pageSize removed as it was unused)
  // Column order (drag & drop)
  // Schema warnings
  const header = useMemo(() => (rows.length ? rows[0] : []), [rows]);

  useEffect(() => {
    if (header.length && columnOrder.length !== header.length) {
      setColumnOrder(Array.from({ length: header.length }, (_, i) => i));
    }
    if (header.length) {
      const lower = header.map(h => (h || '').toLowerCase());
      const missing = REQUIRED_COLS.filter(c => !lower.includes(c.toLowerCase()));
      setSchemaWarn(missing);
    } else {
      setSchemaWarn([]);
    }
  }, [header]);
  const body = useMemo(() => (rows.length > 1 ? rows.slice(1) : []), [rows]);

  const searchedBody = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return body;
    return body.filter(r => r.some(c => (c || '').toLowerCase().includes(q)));
  }, [body, search]);

  const tagsCol = useMemo(() => header.findIndex(h => (h || '').toLowerCase() === 'tags'), [header]);

  const parseTags = (s: string | undefined) => (s || '')
    .split(/[;|,]/)
    .map(t => t.trim())
    .filter(Boolean);

  const popularTags = useMemo(() => {
    const m = new Map<string, number>();
    searchedBody.forEach(r => {
      const list = parseTags(tagsCol >= 0 ? r[tagsCol] : undefined);
      list.forEach(tag => m.set(tag, (m.get(tag) || 0) + 1));
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [searchedBody, tagsCol]);

  const filteredBody = useMemo(() => {
    if (!selectedTags.size || tagsCol < 0) return searchedBody;
    return searchedBody.filter(r => {
      const set = new Set(parseTags(r[tagsCol]));
      for (const t of selectedTags) if (!set.has(t)) return false; // AND filter
      return true;
    });
  }, [searchedBody, selectedTags, tagsCol]);

  // Mini-chart helpers
  const hourCounts = useMemo(() => {
    const idxUTC = header.findIndex(h => (h||'').toLowerCase() === 'utc');
    const arr = new Array(24).fill(0);
    filteredBody.forEach(r => {
      const t = r[idxUTC];
      const d = t ? new Date(t) : null;
      if (d && !isNaN(d.getTime())) arr[d.getUTCHours()]++;
    });
    return arr;
  }, [filteredBody, header]);

  const renderBars = (values: number[], w=220, h=60) => {
    const max = Math.max(1, ...values);
    const bw = w / values.length;
    return (
      <svg width={w} height={h} aria-label="histogram" role="img">
        {values.map((v,i)=>{
          const bh = (v/max)* (h-2);
          return <rect key={i} x={i*bw+0.5} y={h-bh-1} width={Math.max(1,bw-2)} height={bh} rx={2} ry={2} fill="currentColor" opacity={0.6}/>;
        })}
      </svg>
    );
  };

  const sortedBody = useMemo(() => {
    const out = [...filteredBody];
    const keys = sortKeys.length ? sortKeys : [{ idx: 0, dir: 'asc' }];
    out.sort((a, b) => {
      for (const { idx, dir } of keys) {
        const av = a[idx] ?? '';
        const bv = b[idx] ?? '';
        const an = Date.parse(av); const bn = Date.parse(bv);
        let cmp = 0;
        if (!isNaN(an) && !isNaN(bn)) cmp = an - bn; else if (!isNaN(Number(av)) && !isNaN(Number(bv))) cmp = Number(av) - Number(bv); else cmp = String(av).localeCompare(String(bv));
        if (cmp !== 0) return dir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
    return out;
  }, [filteredBody, sortKeys]);

  const totalPages = Math.max(1, Math.ceil(sortedBody.length / Math.max(1, pageSize)));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);
  const pagedBody = useMemo(() => {
    if (!paging) return sortedBody;
    const startIdx = (Math.max(1, page) - 1) * Math.max(1, pageSize);
    return sortedBody.slice(startIdx, startIdx + pageSize);
  }, [sortedBody, paging, page, pageSize]);

  const [scrollTop, setScrollTop] = useState(0);
  const [viewH, setViewH] = useState(400);

  useEffect(() => {
    const el = tableWrapRef.current;
    if (!el) return;
    const onResize = () => setViewH(el.clientHeight || 400);
    onResize();
    const ro = new ResizeObserver(onResize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 5);
  const visible = Math.ceil(viewH / rowHeight) + 10;
  const end = Math.min(sortedBody.length, start + visible);
  const topPad = start * rowHeight;
  const bottomPad = Math.max(0, (sortedBody.length - end) * rowHeight);
  const visBody = sortedBody.slice(start, end);

  const isProbablyHTML = (t: string) => {
    const s = t.trim().slice(0, 200).toLowerCase();
    return s.startsWith('<!doctype html') || s.startsWith('<html');
  };

  const loadLocalFile = async (f: File) => {
    setLoading(true); setError(null);
    try {
      const text = await f.text();
      const parsed = parseCSV(text);
      setRows(parsed);
    } catch (e: any) {
      setError(e?.message || String(e));
      setRows([]);
    } finally { setLoading(false); }
  };

  const downloadFilteredCsv = () => {
    const lines = [header, ...sortedBody];
    const esc = (s: any) => {
      const v = s ?? '';
      return /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
    };
    const text = lines.map(r => r.map(esc).join(',')).join('\n');
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'filtered.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const loadCsv = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(csvPath, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const ctype = res.headers.get('content-type') || '';
      if (ctype && !/text\/csv|text\/plain|application\/octet-stream/i.test(ctype)) {
        if (isProbablyHTML(text)) {
          throw new Error('Got HTML instead of CSV. Put your file under the Vite public/ folder (e.g. public/runs/latest/telemetry.csv) and load it via /runs/latest/telemetry.csv');
        }
      }
      const parsed = parseCSV(text);
      if (parsed.length && !header.length) {
        setHiddenCols(new Set());
      }
      setRows(parsed);
    } catch (err: any) {
      setError(err?.message || String(err));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="layout">
      <header className="toolbar header">
        <strong className="header__title">Seventh Horizon • Telemetry</strong>
        <div className="toolbar-gap">
          <input
            ref={inputRef}
            className="input"
            placeholder="CSV path…"
            value={csvPath}
            onChange={(e) => setCsvPath(e.target.value)}
            style={{ width: 360 }} />
          <small style={{ opacity: .7 }}>Tip: place CSV at <code>public/runs/latest/telemetry.csv</code> and load via <code>/runs/latest/telemetry.csv</code>.</small>
          <input
            className="search"
            placeholder="Search all columns…"
            value={search}
            onChange={(e) => setSearch(e.target.value)} />
          <button className="pill" onClick={() => setWrap(w => !w)}>{wrap ? '↔ No Wrap' : '↩ Wrap Cells'}</button>
          <button className="pill" onClick={() => setSelectedTags(new Set())} disabled={!selectedTags.size}>Clear Tags</button>
          <button className="pill" onClick={downloadFilteredCsv}>⬇ Export CSV</button>
          <button className="pill" onClick={() => fileRef.current?.click()}>⬆ Upload CSV</button>
          <input
            id="csvUpload"
            ref={fileRef}
            className="file"
            type="file"
            accept=".csv,text/csv"
            aria-label="Upload telemetry CSV"
            title="Upload telemetry CSV"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) loadLocalFile(f);
              e.currentTarget.value = '';
            }}
          />
          <button className="pill" data-test="open-drawer" onClick={() => setDrawerOpen(d => !d)}>
            {drawerOpen ? '◀ Hide Filters' : '▶ Show Filters'}
          </button>
          <button className="pill" onClick={() => setShowColsModal(true)}>☰ Columns…</button>
          <button className="pill" onClick={() => { navigator.clipboard.writeText(window.location.href); setCopied('Link copied'); setTimeout(()=>setCopied(null), 900); }}>🔗 Copy link</button>
          <span className="pill switch">
            <label><input type="checkbox" checked={paging} onChange={(e) => { setPaging(e.target.checked); setPage(1); } } /> Paging</label>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); } }>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
          </span>
          <span className="pill switch">
            <label><input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} /> Auto-refresh</label>
            <input type="number" min={5} step={5} value={refreshSec} onChange={(e) => setRefreshSec(Number(e.target.value) || 15)} title="seconds" />
          </span>
        </div>
        <div className="header__right">
          <button className="pill" onClick={() => setTheme(t => t === 'rose' ? 'veil' : 'rose')}>
            {theme === 'rose' ? '🌫 Veil' : '🌸 Rose'}
          </button>
          <button className="pill" onClick={loadCsv} disabled={loading}>
            {loading ? 'Loading…' : '⟳ Reload'}
          </button>
        </div>
      </header>

      <div className="layout" style={{ display: 'grid', gridTemplateColumns: drawerOpen ? '280px 1fr' : '1fr', gap: 16, marginTop: 16 }}>
        {drawerOpen && (
        <aside className="card" data-test="drawer" style={{ padding: 16, borderRadius: 12 }}>
          <h3 style={{ marginTop: 0 }}>Runs</h3>
          <div style={{ opacity: .7 }}>No runs</div>

          <h3 style={{ marginTop: 24 }}>Popular Tags</h3>
          <div className="chips">
            {popularTags.length ? popularTags.map(([tag, count]) => {
              const active = selectedTags.has(tag);
              return (
                <button key={tag} className={`chip${active ? ' active' : ''}`} onClick={() => {
                  const next = new Set(selectedTags);
                  if (active) next.delete(tag); else next.add(tag);
                  setSelectedTags(next);
                } }>{tag}<span className="count">{count}</span></button>
              );
            }) : <div style={{ opacity: .7 }}>—</div>}
          </div>

          <h3 style={{ marginTop: 24 }}>Columns</h3>
          <div className="menu">
            {(header.length ? header : ['RunID', 'UTC', 'Tags', 'CWD', 'GitBranch', 'GitCommit', 'Python']).map((h, i) => {
              const hidden = hiddenCols.has(i);
              return (
                <label key={i}><input type="checkbox" checked={!hidden} onChange={(e) => {
                  const next = new Set(hiddenCols); if (e.target.checked) next.delete(i); else next.add(i); setHiddenCols(next);
                } } /> {h || `Column ${i + 1}`}</label>
              );
            })}
          </div>
        </aside>
        )}

        <section className={`card ${wrap ? 'wrap-on' : ''}`} style={{ padding: 16, borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Filtered Rows</h2>
          {error && <div className="pill" role="alert" style={{ marginBottom: 12 }}>Error: {error}</div>}
          <div className="pager" style={{ marginBottom: 12 }}>
            <button className="pill" onClick={() => setPage(1)} disabled={!paging || page <= 1}>⏮</button>
            <button className="pill" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!paging || page <= 1}>◀</button>
            <span className="muted">Page</span>
            <input type="number" min={1} max={totalPages} value={page}
              onChange={(e) => setPage(Math.min(totalPages, Math.max(1, Number(e.target.value) || 1)))} />
            <span className="muted">of {totalPages}</span>
            <button className="pill" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={!paging || page >= totalPages}>▶</button>
            <button className="pill" onClick={() => setPage(totalPages)} disabled={!paging || page >= totalPages}>⏭</button>
            <span className="muted" style={{ marginLeft: 8 }}>{sortedBody.length.toLocaleString()} rows</span>
          </div>
          {schemaWarn.length > 0 && (
            <div className="validator" title="CSV schema hints" style={{ marginLeft: 8 }}>
              <b>CSV Validator:</b> Missing {schemaWarn.map(s => `"${s}"`).join(', ')} (synthesizing empty columns)
            </div>
          )}
          <div className="mini" style={{marginBottom:12}}>
            <div className="mini-card">
              <h4>Rows (this view)</h4>
              <div>{(paging ? pagedBody.length : sortedBody.length).toLocaleString()}</div>
            </div>
            <div className="mini-card">
              <h4>Tags (top 10)</h4>
              {renderBars(popularTags.slice(0,10).map(([,c])=>c))}
            </div>
            <div className="mini-card">
              <h4>UTC by Hour</h4>
              {renderBars(hourCounts, 260, 60)}
            </div>
          </div>
          <div ref={tableWrapRef} className="table-wrap" style={{ overflow: 'auto' }} onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}>
            <table className="table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  {(columnOrder.length ? columnOrder : (header.length ? header.map((_, i) => i) : [0, 1, 2, 3, 4, 5, 6])).map((colIdx) => (
                    hiddenCols.has(colIdx) ? null : (
                      <th
                        key={colIdx}
                        draggable
                        style={{ ['--colw' as any]: colWidths[colIdx] ? `${colWidths[colIdx]}px` : undefined }}
                        onDragStart={() => { dragFrom.current = colIdx; } }
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          const from = dragFrom.current; if (from === null) return;
                          if (from === colIdx) return;
                          const current = columnOrder.length ? [...columnOrder] : (header.length ? header.map((_, i) => i) : []);
                          const fi = current.indexOf(from); const ti = current.indexOf(colIdx);
                          if (fi < 0 || ti < 0) return;
                          current.splice(ti, 0, current.splice(fi, 1)[0]);
                          setColumnOrder(current);
                          dragFrom.current = null;
                        } }
                        className={`col-${colIdx} sortable ${sortKeys[0]?.idx === colIdx ? (sortKeys[0].dir === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}
                        onClick={(e) => {
                          const col = colIdx;
                          setSortKeys(prev => {
                            const found = prev.findIndex(k => k.idx === col);
                            if (!e.shiftKey) {
                              if (found >= 0) { const dir = prev[found].dir === 'asc' ? 'desc' : 'asc'; return [{ idx: col, dir }]; }
                              return [{ idx: col, dir: 'asc' }];
                            }
                            const next = [...prev];
                            if (found >= 0) next[found] = { idx: col, dir: next[found].dir === 'asc' ? 'desc' : 'asc' };
                            else next.push({ idx: col, dir: 'asc' });
                            return next;
                          });
                        } }
                      >
                        <div className="th-inner"><span className="drag-handle">⋮⋮</span>{header[colIdx] || '\u00A0'}</div>
                        <span
                          className="resize-handle"
                          onMouseDown={(e)=>{
                            e.preventDefault();
                            const th = (e.currentTarget.parentElement as HTMLTableCellElement);
                            const w = th.getBoundingClientRect().width;
                            resizing.current = { col: colIdx, startX: e.clientX, startW: w };
                          }}
                        />
                      </th>
                    )
                  ))}
                </tr>
              </thead>
              <tbody>
                {(paging ? pagedBody : sortedBody).length ? (
                  paging ? (
                    <>
                      {(pagedBody).map((r, i) => (
                        <tr key={(page - 1) * pageSize + i}>
                          {(columnOrder.length ? columnOrder : (header.length ? header.map((_, i) => i) : r.map((_, i) => i))).map((colIdx) => (
                            hiddenCols.has(colIdx) ? null : (
                              <td
                                key={colIdx}
                                className={`col-${colIdx}`}
                                title={r[colIdx] ?? ''}
                                style={{ ['--colw' as any]: colWidths[colIdx] ? `${colWidths[colIdx]}px` : undefined }}
                              >
                                <span
                                  onClick={()=>copyCell(String(colIdx === tagsCol ? parseTags(r[colIdx]).join(' · ') : (r[colIdx] ?? '')))}
                                  style={{cursor:'copy'}}
                                >
                                  {colIdx === tagsCol ? parseTags(r[colIdx]).join(' · ') : (r[colIdx] ?? '')}
                                </span>
                              </td>
                            )
                          ))}
                        </tr>
                      ))}
                    </>
                  ) : (
                    <>
                      <tr className="spacer" style={{ height: topPad }} />
                      {visBody.map((r, i) => (
                        <tr key={start + i}>
                          {(columnOrder.length ? columnOrder : (header.length ? header.map((_, i) => i) : r.map((_, i) => i))).map((colIdx) => (
                            hiddenCols.has(colIdx) ? null : (
                              <td
                                key={colIdx}
                                className={`col-${colIdx}`}
                                title={r[colIdx] ?? ''}
                                style={{ ['--colw' as any]: colWidths[colIdx] ? `${colWidths[colIdx]}px` : undefined }}
                              >
                                <span
                                  onClick={()=>copyCell(String(colIdx === tagsCol ? parseTags(r[colIdx]).join(' · ') : (r[colIdx] ?? '')))}
                                  style={{cursor:'copy'}}
                                >
                                  {colIdx === tagsCol ? parseTags(r[colIdx]).join(' · ') : (r[colIdx] ?? '')}
                                </span>
                              </td>
                            )
                          ))}
                        </tr>
                      ))}
                      <tr className="spacer" style={{ height: bottomPad }} />
                    </>
                  )
                ) : (
                  <tr><td colSpan={Math.max(7, header.length || 7)} style={{ opacity: .7, padding: '12px 8px' }}>No data loaded</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showColsModal && (
        <div className="modal-backdrop" onClick={() => setShowColsModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header>Choose Columns (drag to reorder in table)</header>
            <div className="body">
              <div className="menu">
                {(columnOrder.length ? columnOrder : (header.length ? header.map((_, i) => i) : [])).map((colIdx) => {
                  const hidden = hiddenCols.has(colIdx);
                  return (
                    <label key={colIdx}>
                      <input type="checkbox" checked={!hidden} onChange={(e) => {
                        const next = new Set(hiddenCols);
                        if (e.target.checked) next.delete(colIdx); else next.add(colIdx);
                        setHiddenCols(next);
                      } } /> {header[colIdx] || `Column ${colIdx + 1}`}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="actions">
              <button className="pill" onClick={() => { setHiddenCols(new Set()); setColumnOrder(Array.from({ length: header.length }, (_, i) => i)); } }>Reset</button>
              <button className="pill" onClick={() => setShowColsModal(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
      {copied && <div className="copied-tip" role="status" aria-live="polite">{copied}</div>}
      <footer className="status" style={{ marginTop: 16, opacity: .8, fontSize: 12 }}>
        Theme: <code>{theme}</code>
      </footer>
    </div>
  );
}

export default App;