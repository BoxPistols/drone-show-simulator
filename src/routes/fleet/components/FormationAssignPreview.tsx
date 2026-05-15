import { useMemo } from 'react';

interface Props {
  /** Index of the highlighted slot (0..659). */
  slot: number;
}

const N = 660;

/**
 * Static Fibonacci-sphere preview indicating where the selected drone sits
 * within the canonical formation. Only the highlighted slot is interactive
 * to a screen reader; the rest is a decorative pattern.
 */
export function FormationAssignPreview({ slot }: Props) {
  const pts = useMemo(() => {
    const out: { x: number; y: number }[] = [];
    const phi = Math.PI * (Math.sqrt(5) - 1);
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const t = phi * i;
      out.push({ x: Math.cos(t) * r, y: y * 0.6 });
    }
    return out;
  }, []);

  return (
    <div
      className="assign-mini"
      role="img"
      aria-label={`スロット ${String(slot + 1)} / 660 の位置`}
    >
      {pts.map((p, i) => (
        <div
          key={i}
          className={`pt ${i === slot ? 'self' : ''}`}
          style={{ left: `${(50 + p.x * 40).toFixed(2)}%`, top: `${(50 - p.y * 35).toFixed(2)}%` }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
