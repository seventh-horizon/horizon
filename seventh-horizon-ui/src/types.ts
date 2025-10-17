// src/types.ts
export type Theme = 'rose' | 'veil';

export type SortDir = 'asc' | 'desc';

export type SortKey = {
  idx: number;
  dir: SortDir;
};

// Optional helper types used by components
export type Row = (string | number | boolean | null | undefined)[];