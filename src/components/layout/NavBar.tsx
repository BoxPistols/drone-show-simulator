import { NavLink } from 'react-router-dom';
import { BrandMark } from '~/components/icons/BrandMark';

interface NavItem {
  to: string;
  jp: string;
  en: string;
  end?: boolean;
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', jp: '観賞', en: 'Show', end: true },
  { to: '/fleet', jp: '機体', en: 'Fleet' },
  { to: '/choreography', jp: '振付', en: 'Choreo' },
  { to: '/schedule', jp: '運航', en: 'Schedule' },
];

interface Props {
  /** Show the live "ON AIR" pill on the right (defaults to true on Show page). */
  showLivePill?: boolean;
}

/**
 * Top navigation rendered across all SPA routes. Uses NavLink so the active
 * route gets the moonstone highlight automatically (no manual route matching).
 */
export function NavBar({ showLivePill = false }: Props) {
  return (
    <nav className="app-nav" aria-label="プライマリナビゲーション">
      <div className="nav-brand">
        <div className="nav-mark">
          <BrandMark size={18} />
        </div>
        <div className="nav-brand-text">
          <div className="jp">星群</div>
          <div className="en">Astra Flock</div>
        </div>
      </div>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
        >
          <span className="jp">{item.jp}</span>
          <span className="en">{item.en}</span>
        </NavLink>
      ))}
      <div className="nav-spacer" />
      {showLivePill && (
        <div className="nav-live" role="status" aria-label="ライブ配信中">
          <span className="nav-live-dot" aria-hidden="true" />
          <span>ON AIR</span>
        </div>
      )}
    </nav>
  );
}
