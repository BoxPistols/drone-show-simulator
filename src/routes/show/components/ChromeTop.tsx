import { NavLink } from 'react-router-dom';
import { BrandMark } from '~/components/icons/BrandMark';

interface Stat {
  label: string;
  value: string;
  unit?: string;
}

interface Props {
  stats: readonly Stat[];
}

interface NavItem {
  to: string;
  jp: string;
  en: string;
  end?: boolean;
}
const NAV: readonly NavItem[] = [
  { to: '/', jp: '観賞', en: 'Show', end: true },
  { to: '/fleet', jp: '機体', en: 'Fleet' },
  { to: '/choreography', jp: '振付', en: 'Choreo' },
  { to: '/schedule', jp: '運航', en: 'Schedule' },
];

export function ChromeTop({ stats }: Props) {
  return (
    <div className="hud chrome-top">
      <div className="brand">
        <div className="brand-mark">
          <BrandMark size={22} />
        </div>
        <div className="brand-text">
          <div className="jp">星群</div>
          <div className="en">Astra Flock ・ Live</div>
        </div>
      </div>
      <nav className="show-nav" aria-label="プライマリナビゲーション">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => 'sn-item' + (isActive ? ' active' : '')}
          >
            <span className="jp">{item.jp}</span>
            <span className="en">{item.en}</span>
          </NavLink>
        ))}
      </nav>
      <div className="chrome-top-right">
        <div className="live-pill" role="status" aria-label="ライブ配信中">
          <span className="live-dot" aria-hidden="true" /> ON AIR
        </div>
        <div className="stat-cluster">
          {stats.map((s) => (
            <div className="stat" key={s.label}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">
                {s.value}
                {s.unit && <span className="stat-unit">{s.unit}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
