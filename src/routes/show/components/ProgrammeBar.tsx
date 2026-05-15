import type { ComputedFormation } from '~/types/formations';
import { fmtTime } from '../utils';

interface Props {
  formations: readonly ComputedFormation[];
  currentIndex: number;
  currentTime: number;
  totalTime: number;
  onSeek: (i: number) => void;
}

export function ProgrammeBar({ formations, currentIndex, currentTime, totalTime, onSeek }: Props) {
  const fillPct = totalTime > 0 ? ((currentTime / totalTime) * 100).toFixed(2) : '0';
  return (
    <div className="programme">
      <div className="prog-header">
        <div className="prog-title">
          本日の演目 <span className="en">Tonight&apos;s Programme</span>
        </div>
        <div className="prog-time">
          <span>{fmtTime(currentTime)}</span>
          <span className="sep">/</span>
          <span>{fmtTime(totalTime)}</span>
        </div>
      </div>
      <div className="prog-track">
        <div className="prog-rail">
          <div className="prog-rail-fill" style={{ width: `${fillPct}%` }} />
        </div>
        <div className="prog-chapters">
          {formations.map((f, i) => {
            const cls =
              'chapter' + (i === currentIndex ? ' active' : i < currentIndex ? ' past' : '');
            return (
              <button
                key={f.id}
                type="button"
                className={cls}
                onClick={() => onSeek(i)}
                aria-label={`演目 ${i + 1}: ${f.jp}`}
                aria-current={i === currentIndex ? 'true' : undefined}
              >
                <div className="chapter-dot" aria-hidden="true" />
                <div className="chapter-meta">
                  <div className="chapter-num">{String(i + 1).padStart(2, '0')}</div>
                  <div className="chapter-label">{f.jp}</div>
                  <div className="chapter-time">{fmtTime(f.start)}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
