// src/hooks/useTableState.ts
import { useReducer } from 'react';
import { produce } from 'immer';
import type { TableState, SortKey } from '../types';

type Action =
  | { type: 'SET_CSV_PATH'; payload: string }
  | { type: 'SET_ROWS'; payload: any[][] }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'TOGGLE_WRAP' }
  | { type: 'SET_PAGING'; payload: boolean }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_PAGE_SIZE'; payload: number }
  | { type: 'SET_AUTO_REFRESH'; payload: boolean }
  | { type: 'SET_REFRESH_SEC'; payload: number }
  | { type: 'TOGGLE_COLUMN'; payload: number }
  | { type: 'RESET_COLUMNS' }
  | { type: 'SET_COLUMN_ORDER'; payload: number[] }
  | { type: 'SET_SORT_KEYS'; payload: SortKey[] }
  | { type: 'TOGGLE_TAG'; payload: string }
  | { type: 'CLEAR_TAGS' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_COPIED'; payload: string | null }
  | { type: 'SET_SHOW_COLS_MODAL'; payload: boolean }
  | { type: 'SET_THEME' };

const initial: TableState = {
  theme: 'rose',
  csvPath: '',
  rows: [],
  search: '',
  wrap: false,
  paging: true,
  page: 1,
  pageSize: 50,
  autoRefresh: false,
  refreshSec: 15,
  hiddenCols: new Set<number>(),
  columnOrder: [],
  sortKeys: [],
  selectedTags: new Set<string>(),
  loading: false,
  error: null,
  copied: null,
  showColsModal: false,
};

function reducer(state: TableState, action: Action): TableState {
  return produce(state, (draft: TableState) => {
    switch (action.type) {
      case 'SET_CSV_PATH':
        draft.csvPath = action.payload;
        draft.page = 1;
        return;
      case 'SET_ROWS':
        draft.rows = action.payload ?? [];
        // reset page/order when rows change
        draft.page = 1;
        if (draft.rows.length) {
          draft.columnOrder = draft.rows[0].map((_: unknown, i: number) => i);
        } else {
          draft.columnOrder = [];
        }
        return;
      case 'SET_SEARCH':
        draft.search = action.payload;
        draft.page = 1;
        return;
      case 'TOGGLE_WRAP':
        draft.wrap = !draft.wrap;
        return;
      case 'SET_PAGING':
        draft.paging = action.payload;
        draft.page = 1;
        return;
      case 'SET_PAGE':
        draft.page = Math.max(1, action.payload);
        return;
      case 'SET_PAGE_SIZE':
        draft.pageSize = Math.max(1, action.payload);
        draft.page = 1;
        return;
      case 'SET_AUTO_REFRESH':
        draft.autoRefresh = action.payload;
        return;
      case 'SET_REFRESH_SEC':
        draft.refreshSec = Math.max(5, Math.floor(action.payload));
        return;
      case 'TOGGLE_COLUMN': {
        const idx = action.payload;
        if (draft.hiddenCols.has(idx)) draft.hiddenCols.delete(idx);
        else draft.hiddenCols.add(idx);
        draft.page = 1;
        return;
      }
      case 'RESET_COLUMNS':
        draft.hiddenCols.clear();
        if (draft.rows.length) {
          draft.columnOrder = draft.rows[0].map((_: unknown, i: number) => i);
        } else {
          draft.columnOrder = [];
        }
        draft.page = 1;
        return;
      case 'SET_COLUMN_ORDER': {
        const incoming = action.payload.slice();
        const headerLen = draft.rows.length ? draft.rows[0].length : 0;

        const lengthOK = incoming.length === headerLen;
        const set = new Set(incoming);
        const uniqOK = set.size === incoming.length;
        const rangeOK = incoming.every((n) => Number.isInteger(n) && n >= 0 && n < headerLen);

        if (lengthOK && uniqOK && rangeOK) {
          draft.columnOrder = incoming;
        } else {
          draft.columnOrder = headerLen ? Array.from({ length: headerLen }, (_, i) => i) : [];
        }
        return;
      }
      case 'SET_SORT_KEYS':
        draft.sortKeys = action.payload.slice();
        return;
      case 'TOGGLE_TAG': {
        const t = action.payload;
        if (draft.selectedTags.has(t)) draft.selectedTags.delete(t);
        else draft.selectedTags.add(t);
        draft.page = 1;
        return;
      }
      case 'CLEAR_TAGS':
        draft.selectedTags.clear();
        draft.page = 1;
        return;
      case 'SET_LOADING':
        draft.loading = action.payload;
        return;
      case 'SET_ERROR':
        draft.error = action.payload;
        return;
      case 'SET_COPIED':
        draft.copied = action.payload;
        return;
      case 'SET_SHOW_COLS_MODAL':
        draft.showColsModal = action.payload;
        return;
      case 'SET_THEME':
        draft.theme = draft.theme === 'rose' ? 'veil' : 'rose';
        return;
    }
  });
}

export function useTableState() {
  return useReducer(reducer, initial);
}