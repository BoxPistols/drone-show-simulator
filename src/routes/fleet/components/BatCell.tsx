interface Props {
  v: number;
}

function colorFor(v: number): string {
  return v > 60 ? 'var(--ok)' : v > 25 ? 'var(--warn)' : 'var(--err)';
}

export function BatCell({ v }: Props) {
  return (
    <div className="bat-cell" aria-label={`バッテリー ${String(v)}%`}>
      <div className="bat-bar" aria-hidden="true">
        <div className="bat-fill" style={{ width: `${String(v)}%`, background: colorFor(v) }} />
      </div>
      <div className="bat-v">{v}%</div>
    </div>
  );
}
