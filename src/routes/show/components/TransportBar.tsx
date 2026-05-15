import type { SpeedStep } from '../types';
import { fmtSpeed } from '../utils';

interface Props {
  playing: boolean;
  speed: SpeedStep;
  onPlayToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSpeedCycle: (dir: 1 | -1) => void;
  onFullscreen: () => void;
  onScreenshot: () => void;
}

export function TransportBar({
  playing,
  speed,
  onPlayToggle,
  onPrev,
  onNext,
  onSpeedCycle,
  onFullscreen,
  onScreenshot,
}: Props) {
  return (
    <div className="transport" role="toolbar" aria-label="再生コントロール">
      <button
        type="button"
        className="t-btn"
        onClick={onPrev}
        aria-label="前の演目 (←)"
        title="前の演目 ・ ←"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3 L5 8 L12 13 Z M4 3 L4 13" />
        </svg>
      </button>
      <button
        type="button"
        className="t-btn play"
        onClick={onPlayToggle}
        aria-label={playing ? '一時停止 (Space)' : '再生 (Space)'}
        aria-pressed={playing}
        title="再生 / 一時停止 ・ Space"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          {playing ? (
            <path d="M4 3 L7 3 L7 13 L4 13 Z M9 3 L12 3 L12 13 L9 13 Z" />
          ) : (
            <path d="M4 3 L13 8 L4 13 Z" />
          )}
        </svg>
      </button>
      <button
        type="button"
        className="t-btn"
        onClick={onNext}
        aria-label="次の演目 (→)"
        title="次の演目 ・ →"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 3 L11 8 L4 13 Z M12 3 L12 13" />
        </svg>
      </button>
      <button
        type="button"
        className="t-speed"
        onClick={(e) => onSpeedCycle(e.shiftKey ? -1 : 1)}
        onWheel={(e) => {
          e.preventDefault();
          onSpeedCycle(e.deltaY > 0 ? 1 : -1);
        }}
        aria-label={`再生速度 ${fmtSpeed(speed)} (+/-)`}
        title="Click / ホイールで変速 ・ Shift+Click で逆送り ・ +/−"
      >
        {fmtSpeed(speed)}
      </button>
      <button
        type="button"
        className="t-btn"
        onClick={onFullscreen}
        aria-label="全画面 (F)"
        title="全画面 ・ F"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2 6 V2 H6 M14 6 V2 H10 M2 10 V14 H6 M14 10 V14 H10" />
        </svg>
      </button>
      <button
        type="button"
        className="t-btn"
        onClick={onScreenshot}
        aria-label="スクリーンショット (S)"
        title="スクリーンショット ・ S"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 5 H5 L6 3 H10 L11 5 H13 V13 H3 Z" />
          <circle cx="8" cy="9" r="2.5" />
        </svg>
      </button>
    </div>
  );
}
