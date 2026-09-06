/* Inline SVG/CSS charts built from real aggregates — no chart libraries. */

export function LineChart({
  series,
  labels,
  max,
}: {
  series: { data: number[]; color: string; dashed?: boolean; area?: boolean }[];
  labels: string[];
  max?: number;
}) {
  const W = 720,
    H = 240,
    pad = 28;
  const n = Math.max(2, labels.length);
  const m =
    max ?? Math.max(1, ...series.flatMap((s) => s.data)) * 1.1;
  const x = (i: number) => pad + i * ((W - pad * 2) / (n - 1));
  const y = (v: number) => H - pad - (v / m) * (H - pad * 2);
  const path = (arr: number[]) =>
    arr.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const grid: React.ReactNode[] = [];
  for (let i = 0; i <= 4; i++) {
    const yy = pad + i * ((H - pad * 2) / 4);
    grid.push(<line key={i} x1={pad} y1={yy} x2={W - pad} y2={yy} stroke="#E3E8F1" />);
  }
  return (
    <svg className="linechart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {grid}
      {labels.map((l, i) =>
        l ? (
          <text key={i} className="axis" x={x(i)} y={H - 6} textAnchor="middle">
            {l}
          </text>
        ) : null,
      )}
      <defs>
        <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1B43C8" stopOpacity=".18" />
          <stop offset="1" stopColor="#1B43C8" stopOpacity="0" />
        </linearGradient>
      </defs>
      {series.map((s, si) => (
        <g key={si}>
          {s.area && (
            <path
              d={`${path(s.data)} L${x(s.data.length - 1)} ${H - pad} L${x(0)} ${H - pad} Z`}
              fill="url(#rg)"
            />
          )}
          <path
            d={path(s.data)}
            fill="none"
            stroke={s.color}
            strokeWidth="2.5"
            strokeDasharray={s.dashed ? "2 5" : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {!s.dashed &&
            s.data.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3" fill={s.color} />)}
        </g>
      ))}
    </svg>
  );
}

export function Bars({ rows }: { rows: [string, number, string][] }) {
  return (
    <div className="bars">
      {rows.map(([label, pct, color]) => (
        <div key={label} className="bar-row">
          <span className="bl">{label}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
          </div>
          <span className="bv">{pct}%</span>
        </div>
      ))}
    </div>
  );
}

export function Donut({ segs }: { segs: [string, number, string][] }) {
  // Cumulative offset per segment, computed BEFORE render rather than
  // accumulated inside map(). Mutating a variable while rendering is not safe
  // under concurrent React — a re-entrant render would resume mid-sequence and
  // mis-place every remaining arc.
  const offsets = segs.reduce<number[]>(
    (acc, _seg, i) => [...acc, i === 0 ? 0 : acc[i - 1]! + segs[i - 1]![1]],
    [],
  );
  return (
    <div className="donut-wrap">
      <svg width="150" height="150" viewBox="0 0 42 42">
        {segs.map(([n, v, c], i) => {
          const off = offsets[i]!;
          const el = (
            <circle
              key={n}
              cx="21"
              cy="21"
              r="15.9"
              fill="none"
              stroke={c}
              strokeWidth="6"
              strokeDasharray={`${v} ${100 - v}`}
              strokeDashoffset={25 - off}
            />
          );
          return el;
        })}
      </svg>
      <div className="donut-legend">
        {segs.map(([n, v, c]) => (
          <span key={n}>
            <i style={{ background: c }}></i>
            {n}
            <b>{v}%</b>
          </span>
        ))}
      </div>
    </div>
  );
}
