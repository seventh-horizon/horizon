export type Theme = 'rose' | 'veil';

export type SortKey = {
  idx: number;
  dir: 'asc' | 'desc';
};

export type Row = (string | number | null)[];

/**
 * Defines the complete shape of the application's UI state.
 * This is managed by the `useTableState` hook.
 */
export interface TableState {
  // Data and loading
  csvPath: string;
  rows: Row[];
  loading: boolean;
  error: string | null;

  // UI settings
  theme: Theme;
  wrap: boolean;
  search: string;
  copied: string | null;
  showColsModal: boolean;

  // Filtering and Sorting
  selectedTags: Set<string>;
  hiddenCols: Set<number>;
  columnOrder: number[];
  sortKeys: SortKey[];

  // Pagination
  paging: boolean;
  page: number;
  pageSize: number;

  // Auto-refresh
  autoRefresh: boolean;
  refreshSec: number;
}
