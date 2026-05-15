import { EASING_FN } from '~/lib/easing';
import { EASING_NAMES, type EasingName } from '~/types/formations';

interface Props {
  selected: EasingName;
  onChange: (e: EasingName) => void;
}

/**
 * Per-button SVG curve preview so users can compare easing shapes at a
 * glance — no live time scrubbing here, just static curves.
 * The choice is wrapped in a radio-group landmark for keyboard nav.
 */
export function EasingCurves({ selected, onChange }: Props) {
  return (
    <div className="cr-seg cr-seg-easing" role="radiogroup" aria-label="補間曲線">
      {EASING_NAMES.map((e) => {
        const fn = EASING_FN[e];
        const pts: string[] = [];
        for (let i = 0; i <= 24; i++) {
          const t = i / 24;
          const v = Math.max(-0.3, Math.min(1.3, fn(t)));
          pts.push(`${i === 0 ? 'M' : 'L'}${(t * 36 + 2).toFixed(1)},${(19 - v * 16).toFixed(1)}`);
        }
        return (
          <button
            key={e}
            type="button"
            role="radio"
            aria-checked={selected === e}
            className={selected === e ? 'on' : ''}
            onClick={() => onChange(e)}
          >
            <div className="es-label">{e}</div>
            <svg
              className="es-curve"
              viewBox="0 0 40 22"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <line
                x1="2"
                y1="19"
                x2="38"
                y2="19"
                stroke="currentColor"
                strokeWidth="0.3"
                opacity="0.25"
              />
              <line
                x1="2"
                y1="3"
                x2="38"
                y2="3"
                stroke="currentColor"
                strokeWidth="0.3"
                opacity="0.15"
              />
              <path
                d={pts.join(' ')}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                opacity="0.85"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
