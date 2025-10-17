// src/types.ts

export type Theme = 'rose' | 'veil';

export type SortDir = 'asc' | 'desc';
export interface SortKey {
  idx: number; // column index
  dir: SortDir;
}

export interface TableState {
  theme: Theme;
  csvPath: string;
  rows: any[][]; // first row = header
  search: string;
  wrap: boolean;

  // paging
  paging: boolean;
  page: number;
  pageSize: number;

  // refresh
  autoRefresh: boolean;
  refreshSec: number;

  // column controls
  hiddenCols: Set<number>;
  columnOrder: number[];

  // sorting
  sortKeys: SortKey[];

  // tag filtering
  selectedTags: Set<string>;

  // ui state
  loading: boolean;
  error: string | null;
  copied: string | null;

  // modal
  showColsModal: boolean;
} 