// src/hooks/useTableState.ts
import { useReducer } from 'react';
import { produce, enableMapSet } from 'immer';
import { loadTheme } from '../utils/storage';
import { getInitialStateFromURL } from '../utils/url';
import type { TableState, SortKey } from '../types';

// Enable Immer support for Map/Set so we can safely mutate Sets in draft state.
enableMapSet();

// Define the initial, default state for the application
const initialState: TableState = {
  csvPath: '',
  rows: [],
  loading: true,
  error: null,
  theme: loadTheme(),
  wrap: false,
  search: '',
  copied: null,
  showColsModal: false,
  selectedTags: new Set(),
  hiddenCols: new Set(),
  columnOrder: [],
  sortKeys: [],
  paging: true,
  page: 1,
  pageSize: 50,
  autoRefresh: false,
  refreshSec: 30,
};

// The reducer function handles all state transitions
function tableReducer(state: TableState, action: { type: string; payload?: any }): TableState {
  return produce(state, draft => {
    switch (action.type) {
      case 'SET_ROWS':
        draft.rows = action.payload;
        return;

      case 'SET_LOADING':
        draft.loading = action.payload;
        return;

      case 'SET_ERROR':
        draft.error = action.payload;
        return;

      case 'SET_THEME':
        // Accept either a direct theme payload, or toggle if no payload is provided
        draft.theme = action.payload ?? (draft.theme === 'rose' ? 'veil' : 'rose');
        return;

      case 'SET_CSV_PATH':
        draft.csvPath = action.payload;
        return;

      case 'TOGGLE_WRAP':
        draft.wrap = !draft.wrap;
        return;

      case 'SET_SEARCH':
        draft.search = action.payload;
        draft.page = 1; // Reset to first page on new search
        return;

      case 'TOGGLE_TAG':
        if (draft.selectedTags.has(action.payload)) {
          draft.selectedTags.delete(action.payload);
        } else {
          draft.selectedTags.add(action.payload);
        }
        draft.page = 1;
        return;

      case 'SET_TAG':
        draft.selectedTags.clear();
        draft.selectedTags.add(action.payload);
        draft.page = 1;
        return;

      case 'CLEAR_TAGS':
        draft.selectedTags.clear();
        draft.page = 1;
        return;

      case 'TOGGLE_COLUMN':
        if (draft.hiddenCols.has(action.payload)) {
          draft.hiddenCols.delete(action.payload);
        } else {
          draft.hiddenCols.add(action.payload);
        }
        return;

      case 'SET_COLUMN_ORDER':
        draft.columnOrder = action.payload;
        return;

      case 'RESET_COLUMNS':
        draft.hiddenCols.clear();
        draft.columnOrder = [];
        return;

      // ✅ New: explicit setter for sort keys so AppRefactored's handler works
      case 'SET_SORT_KEYS':
        draft.sortKeys = action.payload as SortKey[];
        return;

      case 'TOGGLE_SORT': {
        const colIdx = action.payload as number;
        const existing = draft.sortKeys.find(k => k.idx === colIdx);
        if (existing) {
          existing.dir = existing.dir === 'asc' ? 'desc' : 'asc';
        } else {
          draft.sortKeys = [{ idx: colIdx, dir: 'asc' }];
        }
        return;
      }

      case 'SET_PAGE':
        draft.page = action.payload;
        return;

      case 'SET_PAGE_SIZE':
        draft.pageSize = action.payload;
        draft.page = 1;
        return;

      case 'SET_PAGING':
        draft.paging = action.payload;
        draft.page = 1;
        return;

      case 'SET_AUTO_REFRESH':
        draft.autoRefresh = action.payload;
        return;

      case 'SET_REFRESH_SEC':
        draft.refreshSec = action.payload;
        return;

      case 'SET_COPIED':
        draft.copied = action.payload;
        return;

      case 'SET_SHOW_COLS_MODAL':
        draft.showColsModal = action.payload;
        return;
    }
  });
}

// The custom hook that encapsulates the state logic
export function useTableState(): [TableState, React.Dispatch<{ type: string; payload?: any }>] {
  const finalInitialState = { ...initialState, ...getInitialStateFromURL() };
  const [state, dispatch] = useReducer(tableReducer, finalInitialState);
  return [state, dispatch];
}