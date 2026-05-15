import { useEffect, useRef } from 'react';
import type { EditableFormation } from '~/types/formations';

const MIN_DUR = 5;
const SNAP_BEATS = 0.2;

interface Props {
  formations: readonly EditableFormation[];
  starts: readonly number[];
  totalDur: number;
  selectedIndex: number;
  time: number;
  bpm: number;
  onSelect: (i: number) => void;
  onSeek: (t: number) => void;
  onSetDur: (i: number, dur: number) => void;
}

function fmt(s: number) {
  const sec = Math.max(0, Math.floor(s));
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

interface DragRef {
  idx: number;
  startX: number;
  trackWidth: number;
  origPrevDur: number;
  prevStart: number;
  totalDurAtStart: number;
}

export function Timeline({
  formations,
  starts,
  totalDur,
  selectedIndex,
  time,
  bpm,
  onSelect,
  onSeek,
  onSetDur,
}: Props) {
  const beatsPerSec = bpm / 60;
  const dragRef = useRef<DragRef | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dtSec = (dx / d.trackWidth) * d.totalDurAtStart;
      let newPrevDur = d.origPrevDur + dtSec;
      const candidateStart = d.prevStart + newPrevDur;
      const beatAt = candidateStart * beatsPerSec;
      const nearest = Math.round(beatAt);
      if (Math.abs(beatAt - nearest) < SNAP_BEATS) {
        const snappedStart = nearest / beatsPerSec;
        newPrevDur = snappedStart - d.prevStart;
      }
      newPrevDur = Math.max(MIN_DUR, newPrevDur);
      onSetDur(d.idx - 1, newPrevDur);
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [beatsPerSec, onSetDur]);

  const handlePointerDown = (i: number, e: React.PointerEvent<HTMLButtonElement>) => {
    if (i === 0) return;
    e.stopPropagation();
    e.preventDefault();
    const track = e.currentTarget.closest('.tl-row') ?? e.currentTarget.parentElement;
    if (!track) return;
    dragRef.current = {
      idx: i,
      startX: e.clientX,
      trackWidth: track.getBoundingClientRect().width,
      origPrevDur: formations[i - 1]!.dur,
      prevStart: starts[i - 1]!,
      totalDurAtStart: totalDur,
    };
  };

  return (
    <div className="tl-tracks">
      <div className="tl-ruler">
        {Array.from({ length: Math.floor(totalDur / 30) + 1 }, (_, i) => (
          <div key={i} className="tl-tick" style={{ left: `${(i * 30 * 100) / totalDur}%` }}>
            {fmt(i * 30)}
          </div>
        ))}
      </div>
      <div className="tl-row">
        {bpm > 0 &&
          Array.from({ length: Math.min(2000, Math.floor(totalDur * beatsPerSec) + 1) }, (_, i) => {
            const t = i / beatsPerSec;
            if (t > totalDur) return null;
            return (
              <div
                key={`b${String(i)}`}
                className={'tl-beat' + (i % 4 === 0 ? ' bar' : '')}
                style={{ left: `${(t / totalDur) * 100}%` }}
                aria-hidden="true"
              />
            );
          })}
        {formations.map((f, i) => {
          const left = (starts[i]! / totalDur) * 100;
          const width = (f.dur / totalDur) * 100;
          return (
            <div
              key={f._uid}
              className={'tl-block' + (i === selectedIndex ? ' active' : '')}
              style={{ left: `${left}%`, width: `${width}%`, background: f.color }}
              onClick={() => {
                onSelect(i);
                onSeek(starts[i]! + 0.01);
              }}
              role="button"
              tabIndex={0}
              aria-label={`${String(i + 1)}: ${f.jp} ${fmt(f.dur)}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(i);
                  onSeek(starts[i]! + 0.01);
                }
              }}
            >
              {i > 0 && (
                <button
                  type="button"
                  className="tl-block-handle"
                  onPointerDown={(e) => handlePointerDown(i, e)}
                  aria-label={`${f.jp} の開始位置`}
                  title={`${f.jp} の開始位置をドラッグで調整`}
                />
              )}
              {String(i + 1).padStart(2, '0')} {f.jp}
            </div>
          );
        })}
        <div
          className="tl-playhead"
          style={{ left: `${(time / totalDur) * 100}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
