import { memo, useId } from 'react';
import type { AudioMeta } from '../hooks/useAudio';

interface Props {
  audio: AudioMeta | null;
  time: number;
  totalDur: number;
  onSeek: (t: number) => void;
}

const SAMPLE_COUNT = 200;
const FALLBACK_SAMPLES = Array.from({ length: SAMPLE_COUNT }, (_, i) =>
  Math.abs(Math.sin(i * 0.27) * Math.cos(i * 0.11))
);

/** 200 本の棒。音源が変わらない限り描き直さない */
const Bars = memo(function Bars({ samples, hasAudio }: { samples: number[]; hasAudio: boolean }) {
  return (
    <>
      {samples.map((sample, i) => {
        const h = hasAudio ? sample * 30 + 2 : 6 + sample * 24;
        return <rect key={i} x={i * 4} y={18 - h / 2} width={2} height={h} />;
      })}
    </>
  );
});

/**
 * 音源の波形と再生位置。再生位置の変化は clipPath の幅 1 箇所だけを更新する
 * （以前は 200 本の rect それぞれの色を毎フレーム計算し直していた）。
 */
export const WaveformBar = memo(function WaveformBar({ audio, time, totalDur, onSeek }: Props) {
  const samples = audio?.samples ?? FALLBACK_SAMPLES;
  // useId の ':' は url(#…) で扱いにくいので外す
  const clipId = 'wf-' + useId().replace(/:/g, '');
  const progress = audio && totalDur > 0 ? Math.max(0, Math.min(1, time / totalDur)) : 0;
  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * totalDur);
  };

  return (
    <div
      className="music-track"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        onSeek(totalDur / 2);
      }}
      style={{ cursor: 'pointer' }}
      role="slider"
      tabIndex={0}
      aria-label="音楽トラック (クリックでシーク)"
      aria-valuemin={0}
      aria-valuemax={Math.round(totalDur)}
      aria-valuenow={Math.round(time)}
    >
      <svg viewBox="0 0 800 36" preserveAspectRatio="none">
        <g fill="rgba(255,255,255,0.35)">
          <Bars samples={samples} hasAudio={audio !== null} />
        </g>
        {audio && (
          <>
            <defs>
              <clipPath id={clipId}>
                <rect x={0} y={0} width={800 * progress} height={36} />
              </clipPath>
            </defs>
            <g fill="var(--moon)" clipPath={`url(#${clipId})`}>
              <Bars samples={samples} hasAudio />
            </g>
          </>
        )}
      </svg>
    </div>
  );
});
