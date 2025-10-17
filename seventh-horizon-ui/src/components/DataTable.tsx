// src/components/DataTable.tsx
import React, { useMemo } from 'react';
import type { SortKey } from '../types';

interface DataTableProps {
  header: (string | number | boolean | null | undefined)[];
  body: (string | number | boolean | null | undefined)[][];
  hiddenCols: Set<number>;
  columnOrder: number[];
  sortKeys: SortKey[];
  onSort: (colIdx: number) => void;
}

export function DataTable({
  header,
  body,
  hiddenCols,
  columnOrder,
  sortKeys,
  onSort,
}: DataTableProps) {
  // Determine visible columns in the correct order
  const visibleIndices = useMemo(() => {
    const base = columnOrder.length ? columnOrder : header.map((_, i) => i);
    return base.filter((i) => !hiddenCols.has(i));
  }, [header, columnOrder, hiddenCols]);

  const primarySort = sortKeys[0];

  const ariaSortFor = (colIdx: number): React.AriaAttributes['aria-sort'] => {
    if (!primarySort || primarySort.idx !== colIdx) return 'none';
    return primarySort.dir === 'asc' ? 'ascending' : 'descending';
  };

  if (!header.length) return null;

  return (
    <div className="table-wrap" role="region" aria-label="Results table" tabIndex={0}>
      <table>
        <thead>
          <tr>
            {visibleIndices.map((colIdx) => {
              const label = String(header[colIdx] ?? `Column ${colIdx + 1}`);
              const ariaSort = ariaSortFor(colIdx);
              return (
                <th key={colIdx} scope="col" aria-sort={ariaSort}>
                  <button
                    type="button"
                    onClick={() => onSort(colIdx)}
                    title={`Sort by ${label}`}
                    aria-label={`Sort by ${label}`}
                    className="th-button"
                  >
                    <span className="th-label">{label}</span>
                    {ariaSort !== 'none' && (
                      <span className="th-sort-indicator" aria-hidden="true">
                        {ariaSort === 'ascending' ? ' ▲' : ' ▼'}
                      </span>
                    )}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rIdx) => (
            <tr key={rIdx}>
              {visibleIndices.map((colIdx) => {
                const v = row[colIdx];
                return (
                  <td key={colIdx} data-col={String(header[colIdx] ?? colIdx)}>
                    {v as React.ReactNode}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}