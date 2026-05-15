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

export function WaveformBar({ audio, time, totalDur, onSeek }: Props) {
  const samples = audio?.samples ?? FALLBACK_SAMPLES;
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
        {samples.map((sample, i) => {
          const h = audio ? sample * 30 + 2 : 6 + sample * 24;
          const progress = totalDur > 0 ? time / totalDur : 0;
          const rectProgress = i / SAMPLE_COUNT;
          const fill = audio
            ? rectProgress <= progress
              ? 'var(--moon)'
              : 'rgba(255,255,255,0.35)'
            : 'rgba(255,255,255,0.35)';
          return <rect key={i} x={i * 4} y={18 - h / 2} width={2} height={h} fill={fill} />;
        })}
      </svg>
    </div>
  );
}
