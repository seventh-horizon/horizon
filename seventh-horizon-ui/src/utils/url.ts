import type { TableState, Theme } from '../types';

/**
 * Creates a publicly accessible URL by prepending the Vite base path.
 */
export function toPublicUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  let baseUrl = import.meta.env.BASE_URL || '/';
  if (!baseUrl.endsWith('/')) baseUrl += '/';
  const cleanedPath = path.replace(/^\/+/, '');
  return `${baseUrl}${cleanedPath}`;
}

type URLSyncParams = Omit<TableState, 'rows' | 'loading' | 'error' | 'copied' | 'showColsModal'>;

/**
 * Sync state to URL query parameters with guards.
 */
export function syncStateToURL(params: URLSyncParams): void {
  if (typeof window === 'undefined') return;

  const p = new URLSearchParams();
  
  if (params.csvPath) p.set('csv', params.csvPath);
  
  // Guard: Only write valid themes to the URL
  if (params.theme === 'rose' || params.theme === 'veil') {
    p.set('theme', params.theme);
  }

  if (params.search) p.set('q', params.search);
  if (params.wrap) p.set('wrap', '1');
  if (params.autoRefresh) p.set('refresh', String(params.refreshSec));
  if (params.selectedTags.size) p.set('tags', Array.from(params.selectedTags).join(';'));
  if (params.hiddenCols.size) p.set('hide', Array.from(params.hiddenCols).sort((a, b) => a - b).join('|'));
  if (params.sortKeys.length) p.set('sort', params.sortKeys.map(k => `${k.idx}:${k.dir}`).join('|'));
  p.set('paging', params.paging ? '1' : '0');
  if (params.page > 1) p.set('pg', String(params.page));
  if (params.pageSize !== 50) p.set('ps', String(params.pageSize));
  if (params.columnOrder.length) p.set('order', params.columnOrder.join('|'));
  
  const queryString = p.toString();
  const url = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;

  const current = window.location.pathname + window.location.search;
  if (current !== url) {
    window.history.replaceState(null, '', url);
  }
}

/**
 * Parse URL query parameters to construct the initial state with guards.
 */
export function getInitialStateFromURL(): Partial<TableState> {
  if (typeof window === 'undefined') return {};

  const p = new URLSearchParams(window.location.search);
  const initialState: Partial<TableState> = {};

  if (p.has('csv')) initialState.csvPath = p.get('csv')!;
  
  // Guard: Validate the theme from the URL, defaulting to 'rose'
  const rawTheme = p.get('theme');
  if (rawTheme === 'rose' || rawTheme === 'veil') {
    initialState.theme = rawTheme;
  } else {
    initialState.theme = 'rose';
  }

  if (p.has('q')) initialState.search = p.get('q')!;
  if (p.has('wrap')) initialState.wrap = p.get('wrap') === '1';
  if (p.has('refresh')) {
    initialState.autoRefresh = true;
    initialState.refreshSec = Number(p.get('refresh')) || 30;
  }
  if (p.has('tags')) initialState.selectedTags = new Set(p.get('tags')!.split(';').filter(Boolean));
  if (p.has('hide')) initialState.hiddenCols = new Set(p.get('hide')!.split('|').map(Number));
  if (p.has('sort')) {
    initialState.sortKeys = p.get('sort')!.split('|').map(s => {
      const [idx, dir] = s.split(':');
      return { idx: Number(idx), dir: dir as 'asc' | 'desc' };
    });
  }
  if (p.has('paging')) initialState.paging = p.get('paging') === '1';
  if (p.has('pg')) initialState.page = Number(p.get('pg')) || 1;
  if (p.has('ps')) initialState.pageSize = Number(p.get('ps')) || 50;
  if (p.has('order')) initialState.columnOrder = p.get('order')!.split('|').map(Number);

  return initialState;
}

