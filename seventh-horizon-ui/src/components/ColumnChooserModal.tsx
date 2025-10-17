import { useState, useEffect, useMemo, useRef } from 'react';

interface ColumnChooserModalProps {
  show: boolean;
  header: string[];
  columnOrder: number[];
  hiddenCols: Set<number>;
  onClose: () => void;
  onToggleColumn: (colIdx: number) => void;
  onOrderChange: (newOrder: number[]) => void;
  onReset: () => void;
}

export function ColumnChooserModal({
  show,
  header,
  columnOrder,
  hiddenCols,
  onClose,
  onToggleColumn,
  onOrderChange,
  onReset,
}: ColumnChooserModalProps) {
  const initialOrder = useMemo(() =>
    columnOrder.length ? columnOrder : header.map((_, i) => i),
    [columnOrder, header]
  );

  const [internalOrder, setInternalOrder] = useState(initialOrder);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Reset internal state if the external props change when modal is opened
  useEffect(() => {
    if (show) {
      setInternalOrder(initialOrder);
    }
  }, [initialOrder, show]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnter = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;

    const newOrder = [...internalOrder];
    const draggedItemContent = newOrder.splice(draggedIndex, 1)[0];
    newOrder.splice(index, 0, draggedItemContent);

    setDraggedIndex(index);
    setInternalOrder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    onOrderChange(internalOrder); // Persist the final order to the parent
  };

  if (!show) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-header"
      >
        <header id="modal-header">Choose Columns (drag to reorder)</header>
        <div className="body">
          <div className="menu">
            {internalOrder.map((colIdx, index) => {
              const hidden = hiddenCols.has(colIdx);
              return (
                <label
                  key={colIdx}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  style={{
                    cursor: 'grab',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px 0',
                    opacity: draggedIndex === index ? 0.5 : 1,
                    transition: 'opacity 0.2s ease-in-out',
                  }}
                >
                  <span style={{ marginRight: '8px', cursor: 'grab' }}>::</span>
                  <input
                    type="checkbox"
                    checked={!hidden}
                    onChange={() => onToggleColumn(colIdx)}
                  />
                  {' '}{header[colIdx] || `Column ${colIdx + 1}`}
                </label>
              );
            })}
          </div>
        </div>
        <div className="actions">
          <button className="pill" onClick={onReset}>
            Reset
          </button>
          <button className="pill" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

