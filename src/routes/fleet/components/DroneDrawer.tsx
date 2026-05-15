import { type Drone, STATUS_META } from '~/lib/fleet';
import { FormationAssignPreview } from './FormationAssignPreview';

export type DroneAction = 'test' | 'recalibrate' | 'exportLog' | 'maint';

interface Props {
  drone: Drone | null;
  onClose: () => void;
  onAction: (kind: DroneAction, drone: Drone) => void;
}

function batColor(v: number): string {
  return v > 60 ? 'var(--ok)' : v > 25 ? 'var(--warn)' : 'var(--err)';
}

export function DroneDrawer({ drone, onClose, onAction }: Props) {
  if (!drone) return null;
  const meta = STATUS_META[drone.status];
  return (
    <aside className="drawer" aria-label={`${drone.id} の詳細`}>
      <button
        type="button"
        className="drw-close"
        onClick={onClose}
        aria-label={`${drone.id} の詳細を閉じる`}
      >
        ×
      </button>
      <div style={{ clear: 'both' }}>
        <h2 className="drw-title">{drone.id}</h2>
        <div className="drw-sub">
          {drone.model} ・ {meta.jp}
        </div>
      </div>

      <section className="drw-section">
        <header className="drw-sec-title">
          <span>Battery</span>
          <span className="jp">電池残量</span>
        </header>
        <div className="drw-big">
          {drone.bat}
          <span className="u">%</span>
        </div>
        <div
          className="bat-bar"
          style={{ width: '100%', marginTop: 10, height: 6 }}
          aria-hidden="true"
        >
          <div
            className="bat-fill"
            style={{ width: `${String(drone.bat)}%`, background: batColor(drone.bat) }}
          />
        </div>
      </section>

      <section className="drw-section">
        <header className="drw-sec-title">
          <span>Telemetry</span>
          <span className="jp">テレメトリ</span>
        </header>
        <div className="drw-row">
          <span className="l">GPS Lock</span>
          <span className="v">{drone.gpsLock ? '✓ 14 sats' : '— no fix'}</span>
        </div>
        <div className="drw-row">
          <span className="l">RSSI</span>
          <span className="v">{drone.rssi} dBm</span>
        </div>
        <div className="drw-row">
          <span className="l">Temp</span>
          <span className="v">{drone.temp} °C</span>
        </div>
        <div className="drw-row">
          <span className="l">Firmware</span>
          <span className="v">{drone.firmware}</span>
        </div>
      </section>

      <section className="drw-section">
        <header className="drw-sec-title">
          <span>Usage</span>
          <span className="jp">運用履歴</span>
        </header>
        <div className="drw-row">
          <span className="l">累計飛行</span>
          <span className="v">{drone.flights} flights</span>
        </div>
        <div className="drw-row">
          <span className="l">飛行時間</span>
          <span className="v">{drone.hours} h</span>
        </div>
        <div className="drw-row">
          <span className="l">最終整備</span>
          <span className="v">
            {drone.lastMaint === 0 ? '本日' : `${String(drone.lastMaint)}日前`}
          </span>
        </div>
      </section>

      <section className="drw-section">
        <header className="drw-sec-title">
          <span>Assignment</span>
          <span className="jp">本日の配置</span>
        </header>
        <div className="drw-row">
          <span className="l">スロット</span>
          <span className="v">#{String(drone.slot).padStart(3, '0')} / 660</span>
        </div>
        <FormationAssignPreview slot={drone.slot} />
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-3)',
            marginTop: 8,
            fontFamily: 'var(--mono)',
            letterSpacing: '0.04em',
          }}
        >
          SPHERE・HELIX・TORUS… 9 formations
        </div>
      </section>

      <section className="drw-section">
        <header className="drw-sec-title">
          <span>Maintenance Log</span>
          <span className="jp">整備記録</span>
        </header>
        <div className="maint-log">
          <div>
            <span className="t">04-18</span> <span className="ok">✓</span> 受信機ファーム更新{' '}
            {drone.firmware}
          </div>
          <div>
            <span className="t">04-15</span> <span className="ok">✓</span> プロペラ交換 #2, #4
          </div>
          <div>
            <span className="t">04-08</span> <span className="warn">!</span> 着陸時センサ異常 —
            再校正
          </div>
          <div>
            <span className="t">03-29</span> <span className="ok">✓</span> 定期点検 (192飛行時間)
          </div>
        </div>
      </section>

      <div className="drw-actions">
        <button type="button" className="drw-btn primary" onClick={() => onAction('test', drone)}>
          テスト起動
        </button>
        <button type="button" className="drw-btn" onClick={() => onAction('recalibrate', drone)}>
          再校正
        </button>
        <button type="button" className="drw-btn" onClick={() => onAction('exportLog', drone)}>
          ログ書出
        </button>
        <button type="button" className="drw-btn danger" onClick={() => onAction('maint', drone)}>
          整備に切替
        </button>
      </div>
    </aside>
  );
}
