interface MiniChartsProps {
  rowCount: number;
  popularTags: [string, number][];
  hourCounts: number[];
}

function renderBars(title: string, values: number[], w = 220, h = 60) {
  const max = Math.max(1, ...values);
  const bw = w / values.length;

  return (
    <svg width={w} height={h} aria-label={`${title} histogram`} role="img">
      <title>{`${title} Histogram`}</title>
      {values.map((v, i) => {
        const bh = (v / max) * (h - 2);
        return (
          <rect
            key={i}
            x={i * bw + 0.5}
            y={h - bh - 1}
            width={Math.max(1, bw - 2)}
            height={bh}
            rx={2}
            ry={2}
            fill="currentColor"
            opacity={0.6}
          />
        );
      })}
    </svg>
  );
}

export function MiniCharts({ rowCount, popularTags, hourCounts }: MiniChartsProps) {
  return (
    <div className="mini" style={{ marginBottom: 12 }}>
      <div className="mini-card">
        <h4>Rows (this view)</h4>
        <div>{rowCount.toLocaleString()}</div>
      </div>
      <div className="mini-card">
        <h4>Tags (top 10)</h4>
        {renderBars(
          'Popular Tags',
          popularTags.slice(0, 10).map(([, c]) => c)
        )}
      </div>
      <div className="mini-card">
        <h4>UTC by Hour</h4>
        {renderBars('UTC by Hour', hourCounts, 260, 60)}
      </div>
    </div>
  );
}
