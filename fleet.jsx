// Fleet management — 660 drone roster
const { useState, useMemo, useEffect } = React;

const FORMATION_NAMES = ['球体','単螺旋','円環','波紋','二重螺旋','立方体','銀河','心臓','熊'];
const MODELS = ['DS-A1','DS-A1','DS-A1','DS-A2','DS-A2 Pro'];
const FIRMWARE = ['v4.2.1','v4.2.1','v4.2.1','v4.2.0','v4.1.8'];

// Deterministic pseudo-random so drone data is stable across renders
function prng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}

function generateFleet() {
  const out = [];
  const statusDist = [
    ...Array(600).fill('active'),
    ...Array(32).fill('charging'),
    ...Array(18).fill('standby'),
    ...Array(10).fill('maint'),
  ];
  // shuffle deterministically
  const r = prng(42);
  for (let i = statusDist.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [statusDist[i], statusDist[j]] = [statusDist[j], statusDist[i]];
  }
  for (let i = 0; i < 660; i++) {
    const rr = prng(i * 7 + 1);
    const id = 'AS-' + String(i + 1).padStart(3, '0');
    const status = statusDist[i];
    const bat = status === 'maint' ? Math.floor(rr() * 30)
              : status === 'charging' ? 30 + Math.floor(rr() * 50)
              : status === 'standby' ? 60 + Math.floor(rr() * 30)
              : 72 + Math.floor(rr() * 28);
    const flights = 180 + Math.floor(rr() * 420);
    const hours = (flights * 0.32 + rr() * 20).toFixed(1);
    const lastMaint = Math.floor(rr() * 42);
    const gpsLock = status !== 'maint';
    const slot = i; // assigned formation slot index
    const model = MODELS[Math.floor(rr() * MODELS.length)];
    const firmware = FIRMWARE[Math.floor(rr() * FIRMWARE.length)];
    const temp = (22 + rr() * 18).toFixed(1);
    const rssi = -(45 + Math.floor(rr() * 25));
    out.push({ id, idx: i, status, bat, flights, hours, lastMaint, gpsLock, slot, model, firmware, temp, rssi });
  }
  return out;
}

const STATUS_META = {
  active: { jp: '稼働中', en: 'Active', chip: 'chip-ok' },
  charging: { jp: '充電中', en: 'Charging', chip: 'chip-warn' },
  standby: { jp: '待機', en: 'Standby', chip: 'chip-standby' },
  maint: { jp: '整備', en: 'Maintenance', chip: 'chip-err' },
};

function BatCell({ v }) {
  const col = v > 60 ? 'var(--ok)' : v > 25 ? 'var(--warn)' : 'var(--err)';
  return (
    <div className="bat-cell">
      <div className="bat-bar"><div className="bat-fill" style={{ width: v+'%', background: col }}/></div>
      <div className="bat-v">{v}%</div>
    </div>
  );
}

function FormationAssignPreview({ slot }) {
  // Fibonacci sphere positions projected to 2D
  const R = 60;
  const n = 660;
  const pts = useMemo(() => {
    const out = [];
    const phi = Math.PI * (Math.sqrt(5) - 1);
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const t = phi * i;
      out.push({ x: Math.cos(t) * r, y: y * 0.6 });
    }
    return out;
  }, []);
  return (
    <div className="assign-mini">
      {pts.map((p, i) => (
        <div
          key={i}
          className={`pt ${i === slot ? 'self' : ''}`}
          style={{ left: (50 + p.x * 40) + '%', top: (50 - p.y * 35) + '%' }}
        />
      ))}
    </div>
  );
}

function DroneDrawer({ drone, onClose, onAction }) {
  if (!drone) return null;
  const meta = STATUS_META[drone.status];
  return (
    <div className="drawer">
      <button className="drw-close" onClick={onClose}>×</button>
      <div style={{ clear: 'both' }}>
        <div className="drw-title">{drone.id}</div>
        <div className="drw-sub">{drone.model} ・ {meta.jp}</div>
      </div>

      <div className="drw-section">
        <div className="drw-sec-title"><span>Battery</span><span className="jp">電池残量</span></div>
        <div className="drw-big">{drone.bat}<span className="u">%</span></div>
        <div className="bat-bar" style={{ width: '100%', marginTop: 10, height: 6 }}>
          <div className="bat-fill" style={{ width: drone.bat+'%', background: drone.bat > 60 ? 'var(--ok)' : drone.bat > 25 ? 'var(--warn)' : 'var(--err)' }}/>
        </div>
      </div>

      <div className="drw-section">
        <div className="drw-sec-title"><span>Telemetry</span><span className="jp">テレメトリ</span></div>
        <div className="drw-row"><span className="l">GPS Lock</span><span className="v">{drone.gpsLock ? '✓ 14 sats' : '— no fix'}</span></div>
        <div className="drw-row"><span className="l">RSSI</span><span className="v">{drone.rssi} dBm</span></div>
        <div className="drw-row"><span className="l">Temp</span><span className="v">{drone.temp} °C</span></div>
        <div className="drw-row"><span className="l">Firmware</span><span className="v">{drone.firmware}</span></div>
      </div>

      <div className="drw-section">
        <div className="drw-sec-title"><span>Usage</span><span className="jp">運用履歴</span></div>
        <div className="drw-row"><span className="l">累計飛行</span><span className="v">{drone.flights} flights</span></div>
        <div className="drw-row"><span className="l">飛行時間</span><span className="v">{drone.hours} h</span></div>
        <div className="drw-row"><span className="l">最終整備</span><span className="v">{drone.lastMaint === 0 ? '本日' : drone.lastMaint + '日前'}</span></div>
      </div>

      <div className="drw-section">
        <div className="drw-sec-title"><span>Assignment</span><span className="jp">本日の配置</span></div>
        <div className="drw-row">
          <span className="l">スロット</span>
          <span className="v">#{String(drone.slot).padStart(3,'0')} / 660</span>
        </div>
        <FormationAssignPreview slot={drone.slot} />
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8, fontFamily: 'var(--mono)', letterSpacing: '0.04em' }}>
          SPHERE・HELIX・TORUS… 9 formations
        </div>
      </div>

      <div className="drw-section">
        <div className="drw-sec-title"><span>Maintenance Log</span><span className="jp">整備記録</span></div>
        <div className="maint-log">
          <div><span className="t">04-18</span> <span className="ok">✓</span> 受信機ファーム更新 {drone.firmware}</div>
          <div><span className="t">04-15</span> <span className="ok">✓</span> プロペラ交換 #2, #4</div>
          <div><span className="t">04-08</span> <span className="warn">!</span> 着陸時センサ異常 — 再校正</div>
          <div><span className="t">03-29</span> <span className="ok">✓</span> 定期点検 (192飛行時間)</div>
        </div>
      </div>

      <div className="drw-actions">
        <button className="drw-btn primary" onClick={()=>onAction('test', drone)}>テスト起動</button>
        <button className="drw-btn" onClick={()=>onAction('recalibrate', drone)}>再校正</button>
        <button className="drw-btn" onClick={()=>onAction('exportLog', drone)}>ログ書出</button>
        <button className="drw-btn danger" onClick={()=>onAction('maint', drone)}>整備に切替</button>
      </div>
    </div>
  );
}

function Fleet() {
  const allDrones = useMemo(() => generateFleet(), []);
  const [view, setView] = useState('grid');
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState(null);

  const stats = useMemo(() => {
    const s = { active:0, charging:0, standby:0, maint:0, lowBat:0 };
    allDrones.forEach(d => { s[d.status]++; if (d.bat < 25) s.lowBat++; });
    return s;
  }, [allDrones]);

  const filtered = useMemo(() => {
    return allDrones.filter(d => {
      if (filter !== 'all' && d.status !== filter) return false;
      if (filter === 'low' && d.bat >= 25) return false;
      if (q && !d.id.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [allDrones, filter, q]);

  const selected = selId ? allDrones.find(d => d.id === selId) : null;

  // --- Mock interactions ---
  const [toast, setToast] = useState('');
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(t => t === msg ? '' : t), 2400);
  };
  const onDroneAction = (kind, drone) => {
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
          `battery=${drone.bat}%`,
          `rssi=${drone.rssi}dBm`,
          `temp=${drone.temp}°C`,
          `flights=${drone.flights}`,
          `hours=${drone.hours}h`,
        ].join('\n');
        const blob = new Blob([rows], {type:'text/plain'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${drone.id}.log`;
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

  return (
    <>
      <div className="fleet-header">
        <div className="fh-title">
          <div className="jp">機体管理</div>
          <div className="en">Fleet Operations</div>
        </div>
        <div className="fh-kpis">
          <div className="kpi">
            <div className="kpi-label">Total</div>
            <div className="kpi-value">{allDrones.length}<span className="tot">機</span></div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Ready</div>
            <div className="kpi-value ok">{stats.active}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Charging</div>
            <div className="kpi-value warn">{stats.charging}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Maint</div>
            <div className="kpi-value err">{stats.maint}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Low Bat</div>
            <div className="kpi-value warn">{stats.lowBat}</div>
          </div>
        </div>
      </div>

      <div className="fleet-toolbar">
        <div className="tb-seg">
          <button className={view==='grid'?'on':''} onClick={()=>setView('grid')}>格子</button>
          <button className={view==='table'?'on':''} onClick={()=>setView('table')}>一覧</button>
        </div>
        <div className="tb-search">
          <input placeholder="AS-042 で検索…" value={q} onChange={e=>setQ(e.target.value)} />
        </div>
        {['all','active','charging','standby','maint','low'].map(k => (
          <div key={k} className={'tb-filter' + (filter===k?' on':'')} onClick={()=>setFilter(k)}>
            {k === 'all' && '全て'}
            {k === 'active' && <><span className="chip-dot" style={{background:'var(--ok)',width:6,height:6,borderRadius:'50%',display:'inline-block'}}/> 稼働中 <span style={{color:'var(--text-3)',fontFamily:'var(--mono)'}}>{stats.active}</span></>}
            {k === 'charging' && <><span className="chip-dot" style={{background:'var(--warn)',width:6,height:6,borderRadius:'50%',display:'inline-block'}}/> 充電中 <span style={{color:'var(--text-3)',fontFamily:'var(--mono)'}}>{stats.charging}</span></>}
            {k === 'standby' && <><span className="chip-dot" style={{background:'var(--text-3)',width:6,height:6,borderRadius:'50%',display:'inline-block'}}/> 待機 <span style={{color:'var(--text-3)',fontFamily:'var(--mono)'}}>{stats.standby}</span></>}
            {k === 'maint' && <><span className="chip-dot" style={{background:'var(--err)',width:6,height:6,borderRadius:'50%',display:'inline-block'}}/> 整備 <span style={{color:'var(--text-3)',fontFamily:'var(--mono)'}}>{stats.maint}</span></>}
            {k === 'low' && <>⚠ 低電量 <span style={{color:'var(--text-3)',fontFamily:'var(--mono)'}}>{stats.lowBat}</span></>}
          </div>
        ))}
        <div className="tb-count">{filtered.length} / {allDrones.length} 機</div>
      </div>

      <div className="fleet-body">
        <div className="fleet-list">
          {view === 'grid' ? (
            <div className="drone-grid">
              {filtered.map(d => (
                <div
                  key={d.id}
                  className={`dg-cell ${d.status} ${selId===d.id?'selected':''}`}
                  onClick={()=>setSelId(d.id)}
                  title={`${d.id} ・ ${STATUS_META[d.status].jp} ・ ${d.bat}%`}
                >
                  <div className={`dg-status st-${d.status}`} />
                  <div className="dg-id">{d.id.replace('AS-','')}</div>
                  <div className="dg-bat">{d.bat}%</div>
                </div>
              ))}
            </div>
          ) : (
            <table className="dt">
              <thead>
                <tr>
                  <th>ID / 機体</th>
                  <th>状態</th>
                  <th>Battery</th>
                  <th>GPS</th>
                  <th>RSSI</th>
                  <th>Model</th>
                  <th>Firmware</th>
                  <th style={{textAlign:'right'}}>飛行</th>
                  <th style={{textAlign:'right'}}>時間</th>
                  <th style={{textAlign:'right'}}>最終整備</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const m = STATUS_META[d.status];
                  return (
                    <tr key={d.id} className={selId===d.id?'selected':''} onClick={()=>setSelId(d.id)}>
                      <td className="mono">{d.id}</td>
                      <td><span className={`chip ${m.chip}`}><span className="chip-dot"/>{m.jp}</span></td>
                      <td><BatCell v={d.bat}/></td>
                      <td style={{color: d.gpsLock?'var(--ok)':'var(--err)'}}>{d.gpsLock?'✓ Lock':'— no fix'}</td>
                      <td className="mono">{d.rssi}</td>
                      <td>{d.model}</td>
                      <td className="mono">{d.firmware}</td>
                      <td className="num">{d.flights}</td>
                      <td className="num">{d.hours}h</td>
                      <td className="num" style={{color:'var(--text-2)'}}>{d.lastMaint===0?'本日':d.lastMaint+'d'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {selected && <DroneDrawer drone={selected} onClose={()=>setSelId(null)} onAction={onDroneAction} />}
      </div>
      {toast && (
        <div style={{
          position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)',
          background:'rgba(8,11,22,0.94)', color:'#fff',
          padding:'12px 22px', borderRadius:10,
          border:'1px solid rgba(49,169,199,0.35)',
          fontFamily:'var(--mincho)', fontSize:13, letterSpacing:'0.06em',
          boxShadow:'0 16px 40px rgba(0,0,0,0.5)',
          zIndex:100, pointerEvents:'none'
        }}>{toast}</div>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('fleet-root')).render(<Fleet />);
