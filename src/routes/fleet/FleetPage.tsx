import { useMemo, useState } from 'react';
import { useToast } from '~/hooks/useToast';
import { fleetStats, generateFleet, STATUS_META, type Drone } from '~/lib/fleet';
import { BatCell } from './components/BatCell';
import { DroneDrawer, type DroneAction } from './components/DroneDrawer';
import './fleet.css';

type ViewMode = 'grid' | 'table';
type Filter = 'all' | 'active' | 'charging' | 'standby' | 'maint' | 'low';

export function FleetPage() {
  const drones = useMemo(() => generateFleet(), []);
  const stats = useMemo(() => fleetStats(drones), [drones]);
  const [view, setView] = useState<ViewMode>('grid');
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return drones.filter((d) => {
      if (filter === 'low' && d.bat >= 25) return false;
      if (filter !== 'all' && filter !== 'low' && d.status !== filter) return false;
      if (q && !d.id.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [drones, filter, q]);

  const selected = selId ? (drones.find((d) => d.id === selId) ?? null) : null;
  const { show: showToast } = useToast();

  const onDroneAction = (kind: DroneAction, drone: Drone) => {
    switch (kind) {
      case 'test':
        showToast(`${drone.id}: テスト起動シーケンス開始 (mock)`);
        break;
      case 'recalibrate':
        showToast(`${drone.id}: IMU / GPS 再校正中… (mock)`);
        break;
      case 'exportLog': {
        const rows = [
          `# ${drone.id} flight log (mock)`,
          `model=${drone.model}`,
          `firmware=${drone.firmware}`,
          `battery=${String(drone.bat)}%`,
          `rssi=${String(drone.rssi)}dBm`,
          `temp=${drone.temp}°C`,
          `flights=${String(drone.flights)}`,
          `hours=${drone.hours}h`,
        ].join('\n');
        const blob = new Blob([rows], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${drone.id}.log`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast(`${drone.id}: ログを書出しました`);
        break;
      }
      case 'maint':
        showToast(`${drone.id}: 整備ステータスに切替えました (mock)`);
        break;
    }
  };

  const filterChips: { key: Filter; label: React.ReactNode }[] = [
    { key: 'all', label: '全て' },
    {
      key: 'active',
      label: (
        <>
          <span
            className="chip-dot"
            style={{ background: 'var(--ok)', width: 6, height: 6, borderRadius: '50%' }}
            aria-hidden="true"
          />{' '}
          稼働中{' '}
          <span style={{ color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{stats.active}</span>
        </>
      ),
    },
    {
      key: 'charging',
      label: (
        <>
          <span
            className="chip-dot"
            style={{ background: 'var(--warn)', width: 6, height: 6, borderRadius: '50%' }}
            aria-hidden="true"
          />{' '}
          充電中{' '}
          <span style={{ color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
            {stats.charging}
          </span>
        </>
      ),
    },
    {
      key: 'standby',
      label: (
        <>
          <span
            className="chip-dot"
            style={{ background: 'var(--text-3)', width: 6, height: 6, borderRadius: '50%' }}
            aria-hidden="true"
          />{' '}
          待機{' '}
          <span style={{ color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{stats.standby}</span>
        </>
      ),
    },
    {
      key: 'maint',
      label: (
        <>
          <span
            className="chip-dot"
            style={{ background: 'var(--err)', width: 6, height: 6, borderRadius: '50%' }}
            aria-hidden="true"
          />{' '}
          整備{' '}
          <span style={{ color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{stats.maint}</span>
        </>
      ),
    },
    {
      key: 'low',
      label: (
        <>
          ⚠ 低電量{' '}
          <span style={{ color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{stats.lowBat}</span>
        </>
      ),
    },
  ];

  return (
    <main className="fleet-main" aria-label="機体管理">
      <header className="fleet-header">
        <div className="fh-title">
          <h1 className="jp" style={{ margin: 0 }}>
            機体管理
          </h1>
          <div className="en">Fleet Operations</div>
        </div>
        <dl className="fh-kpis">
          <div className="kpi">
            <dt className="kpi-label">Total</dt>
            <dd className="kpi-value">
              {drones.length}
              <span className="tot">機</span>
            </dd>
          </div>
          <div className="kpi">
            <dt className="kpi-label">Ready</dt>
            <dd className="kpi-value ok">{stats.active}</dd>
          </div>
          <div className="kpi">
            <dt className="kpi-label">Charging</dt>
            <dd className="kpi-value warn">{stats.charging}</dd>
          </div>
          <div className="kpi">
            <dt className="kpi-label">Maint</dt>
            <dd className="kpi-value err">{stats.maint}</dd>
          </div>
          <div className="kpi">
            <dt className="kpi-label">Low Bat</dt>
            <dd className="kpi-value warn">{stats.lowBat}</dd>
          </div>
        </dl>
      </header>

      <div className="fleet-toolbar" role="toolbar" aria-label="機体一覧の絞り込み">
        <div className="tb-seg" role="radiogroup" aria-label="表示モード">
          <button
            type="button"
            role="radio"
            aria-checked={view === 'grid'}
            className={view === 'grid' ? 'on' : ''}
            onClick={() => setView('grid')}
          >
            格子
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={view === 'table'}
            className={view === 'table' ? 'on' : ''}
            onClick={() => setView('table')}
          >
            一覧
          </button>
        </div>
        <div className="tb-search">
          <input
            type="search"
            placeholder="AS-042 で検索…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="機体 ID で検索"
          />
        </div>
        {filterChips.map(({ key, label }) => (
          <button
            type="button"
            key={key}
            className={'tb-filter' + (filter === key ? ' on' : '')}
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
          >
            {label}
          </button>
        ))}
        <div className="tb-count" role="status">
          {filtered.length} / {drones.length} 機
        </div>
      </div>

      <div className="fleet-body">
        <div className="fleet-list">
          {view === 'grid' ? (
            <ul
              className="drone-grid"
              role="listbox"
              tabIndex={-1}
              aria-label="機体一覧 (格子表示)"
              aria-activedescendant={selId ?? undefined}
            >
              {filtered.map((d) => (
                <li
                  key={d.id}
                  id={d.id}
                  role="option"
                  aria-selected={selId === d.id}
                  className={`dg-cell ${d.status} ${selId === d.id ? 'selected' : ''}`}
                  onClick={() => setSelId(d.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelId(d.id);
                    }
                  }}
                  tabIndex={0}
                  title={`${d.id} ・ ${STATUS_META[d.status].jp} ・ ${String(d.bat)}%`}
                >
                  <span className={`dg-status st-${d.status}`} aria-hidden="true" />
                  <span className="dg-id">{d.id.replace('AS-', '')}</span>
                  <span className="dg-bat">{d.bat}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <table className="dt">
              <thead>
                <tr>
                  <th scope="col">ID / 機体</th>
                  <th scope="col">状態</th>
                  <th scope="col">Battery</th>
                  <th scope="col">GPS</th>
                  <th scope="col">RSSI</th>
                  <th scope="col">Model</th>
                  <th scope="col">Firmware</th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    飛行
                  </th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    時間
                  </th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    最終整備
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const m = STATUS_META[d.status];
                  return (
                    <tr
                      key={d.id}
                      className={selId === d.id ? 'selected' : ''}
                      onClick={() => setSelId(d.id)}
                    >
                      <td className="mono">{d.id}</td>
                      <td>
                        <span className={`chip ${m.chip}`}>
                          <span className="chip-dot" aria-hidden="true" />
                          {m.jp}
                        </span>
                      </td>
                      <td>
                        <BatCell v={d.bat} />
                      </td>
                      <td style={{ color: d.gpsLock ? 'var(--ok)' : 'var(--err)' }}>
                        {d.gpsLock ? '✓ Lock' : '— no fix'}
                      </td>
                      <td className="mono">{d.rssi}</td>
                      <td>{d.model}</td>
                      <td className="mono">{d.firmware}</td>
                      <td className="num">{d.flights}</td>
                      <td className="num">{d.hours}h</td>
                      <td className="num" style={{ color: 'var(--text-2)' }}>
                        {d.lastMaint === 0 ? '本日' : `${String(d.lastMaint)}d`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {selected && (
          <DroneDrawer drone={selected} onClose={() => setSelId(null)} onAction={onDroneAction} />
        )}
      </div>
    </main>
  );
}
