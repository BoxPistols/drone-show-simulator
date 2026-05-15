import type { ComputedFormation } from '~/types/formations';
import { fmtTime } from '../utils';

interface Props {
  formation: ComputedFormation;
  index: number;
  total: number;
}

export function NowPlayingCard({ formation, index, total }: Props) {
  return (
    <div className="now-playing">
      <div className="np-eyebrow">Now Showing — 演目</div>
      <div className="np-number">
        {String(index + 1).padStart(2, '0')}
        <span className="total">/{String(total).padStart(2, '0')}</span>
      </div>
      <div className="np-title-jp">{formation.jp}</div>
      <div className="np-title-en">{formation.en}</div>
      <p className="np-desc">{formation.desc}</p>
      <div className="np-meta">
        <div className="np-meta-item">
          Duration<b>{fmtTime(formation.dur)}</b>
        </div>
        <div className="np-meta-item">
          Composer<b>Morgan Riley</b>
        </div>
      </div>
    </div>
  );
}
