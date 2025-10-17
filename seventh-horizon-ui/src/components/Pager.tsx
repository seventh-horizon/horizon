interface PagerProps {
  paging: boolean;
  page: number;
  totalPages: number;
  totalRows: number;
  onFirstPage: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onLastPage: () => void;
  onPageChange: (page: number) => void;
}

export function Pager({
  paging,
  page,
  totalPages,
  totalRows,
  onFirstPage,
  onPrevPage,
  onNextPage,
  onLastPage,
  onPageChange,
}: PagerProps) {
  return (
    <div className="pager" style={{ marginBottom: 12 }}>
      <button 
        className="pill" 
        onClick={onFirstPage} 
        disabled={!paging || page <= 1}
        aria-label="First Page"
      >
        ⏮
      </button>
      <button 
        className="pill" 
        onClick={onPrevPage} 
        disabled={!paging || page <= 1}
        aria-label="Previous Page"
      >
        ◀
      </button>
      <label htmlFor="page-input" className="muted">Page</label>
      <input
        id="page-input"
        name="page-input"
        type="number"
        min={1}
        max={totalPages}
        value={page}
        onChange={(e) => onPageChange(Math.min(totalPages, Math.max(1, Number(e.target.value) || 1)))}
        aria-label={`Current Page, Page ${page} of ${totalPages}`}
      />
      <span className="muted" aria-hidden="true">of {totalPages}</span>
      <button 
        className="pill" 
        onClick={onNextPage} 
        disabled={!paging || page >= totalPages}
        aria-label="Next Page"
      >
        ▶
      </button>
      <button 
        className="pill" 
        onClick={onLastPage} 
        disabled={!paging || page >= totalPages}
        aria-label="Last Page"
      >
        ⏭
      </button>
      <span className="muted" style={{ marginLeft: 8 }}>
        {totalRows.toLocaleString()} rows
      </span>
    </div>
  );
}