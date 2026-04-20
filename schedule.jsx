const { useState, useMemo } = React;

// Month of April 2026 — deliberate schedule of shows, rehearsals, and maintenance
const EVENTS = {
  '2026-04-03': { type:'rehearsal', title:'予行演習', venue:'葛飾・小合溜', time:'19:30', duration:35, drones:400 },
  '2026-04-10': { type:'show', title:'春の宴 / Haru no Utage', venue:'横浜みなとみらい', time:'20:00', duration:18, drones:660, audience:120000, weather:{temp:14, wind:3.1, visibility:'良好', humidity:58} },
  '2026-04-11': { type:'show', title:'春の宴 (2日目)', venue:'横浜みなとみらい', time:'20:00', duration:18, drones:660, audience:120000 },
  '2026-04-14': { type:'maint', title:'定期整備', venue:'倉庫 B-02', time:'09:00', notes:'AS-100〜AS-200 点検' },
  '2026-04-18': { type:'rehearsal', title:'本番前リハ', venue:'東京湾・お台場沖', time:'21:00', duration:22, drones:660 },
  '2026-04-19': { type:'rehearsal', title:'技術確認', venue:'東京湾・お台場沖', time:'21:00', duration:22, drones:660 },
  '2026-04-28': { type:'show', title:'東京湾の星座', venue:'東京湾・お台場沖', time:'19:00', duration:22, drones:660, audience:180000, weather:{temp:16, wind:2.4, visibility:'良好', humidity:52} },
  '2026-04-29': { type:'show', title:'東京湾の星座 (昭和の日)', venue:'東京湾・お台場沖', time:'19:00', duration:22, drones:660, audience:200000 },
  '2026-05-03': { type:'show', title:'Golden Week 特別公演', venue:'大阪・万博記念公園', time:'19:30', duration:24, drones:660, audience:95000 },
};

const CREW = [
  { name:'Morgan Riley', role:'Flight Director', initials:'MR', color:'#31a9c7', status:'CONFIRMED' },
  { name:'佐藤 美咲', role:'Choreographer', initials:'MS', color:'#d429e0', status:'CONFIRMED' },
  { name:'ライアン・ホール', role:'Safety Officer', initials:'RH', color:'#ffb347', status:'CONFIRMED' },
  { name:'田中 健', role:'Ground Ops Lead', initials:'TK', color:'#98ff9e', status:'CONFIRMED' },
  { name:'小林 陽子', role:'Music Sync', initials:'KY', color:'#ff69b4', status:'PENDING' },
];

const CHECKLIST = [
  { label:'航空局飛行許可 (DID区域)', done:true, note:'No. 2026-0428-T' },
  { label:'気象予報確認（H-72）', done:true },
  { label:'会場入構許可（港湾局）', done:true },
  { label:'全機バッテリー校正', done:true, note:'660/660' },
  { label:'音響システム同期テスト', done:false, warn:true, note:'H-6 予定' },
  { label:'観客動線・警備計画', done:false },
  { label:'緊急着陸ゾーン確認', done:false },
  { label:'保険付保確認', done:true },
];

const TYPE_META = {
  show: { jp:'本番', chip:'#31a9c7', dot:'●' },
  rehearsal: { jp:'リハ', chip:'#ffb347', dot:'●' },
  maint: { jp:'整備', chip:'#ef4444', dot:'●' },
};

const DOW_JP = ['日','月','火','水','木','金','土'];
const DOW_EN = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

function keyFor(y, m, d) { return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }

const MONTH_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function Schedule() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(3); // April (0-indexed)
  const [selDate, setSelDate] = useState('2026-04-28');
  const [checklist, setChecklist] = useState(CHECKLIST);
  const toggleCheck = (i) => {
    setChecklist(c => c.map((ci, idx) => idx === i ? {...ci, done: !ci.done, warn: false} : ci));
  };

  // --- Mock interactions ---
  const [toast, setToast] = useState('');
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(t => t === msg ? '' : t), 2400);
  };
  const goPrevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const goNextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };
  const goToday = () => {
    setYear(2026); setMonth(3); setSelDate('2026-04-19');
    showToast('今日 (2026-04-19) に移動');
  };
  const onInviteCrew = () => showToast(`クルー ${CREW.length} 名に招集通知を送信 (mock)`);
  const onExportCsv = () => {
    const header = 'date,type,title,venue,time,duration,drones,audience';
    const rows = Object.entries(EVENTS).map(([d,e]) =>
      [d, e.type, e.title, e.venue, e.time, e.duration||'', e.drones||'', e.audience||''].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'astra-flock-schedule.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`CSV 書出: ${rows.length} 公演 → astra-flock-schedule.csv`);
  };
  const onAddEvent = () => showToast('新規公演フォーム (mock) — 未接続');

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();
    const out = [];
    for (let i = 0; i < startDow; i++) {
      out.push({ day: prevDays - startDow + 1 + i, key: keyFor(year, month-1, prevDays - startDow + 1 + i), other:true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({ day:d, key: keyFor(year, month, d) });
    }
    while (out.length % 7 !== 0) {
      const d = out.length - startDow - daysInMonth + 1;
      out.push({ day:d, key: keyFor(year, month+1, d), other:true });
    }
    return out;
  }, [year, month]);

  const selEvent = EVENTS[selDate];
  const todayKey = '2026-04-19';

  return (
    <>
      <div className="sc-head">
        <div>
          <div className="jp">運航スケジュール</div>
          <div className="en">Flight Schedule — Spring Season 2026</div>
        </div>
        <div className="sc-actions">
          <button className="sc-btn" onClick={onInviteCrew}>クルー招集</button>
          <button className="sc-btn" onClick={onExportCsv}>CSV書出</button>
          <button className="sc-btn primary" onClick={onAddEvent}>+ 公演を追加</button>
        </div>
      </div>

      <div className="sc-body">
        <div className="sc-cal">
          <div className="cal-nav">
            <div className="cal-month">{year}年 {month+1}月<span className="en">{MONTH_EN[month]}</span></div>
            <div className="cal-arrows">
              <button className="cal-arr" onClick={goPrevMonth} title="前の月">‹</button>
              <button className="cal-arr" onClick={goToday} title="今日">今月</button>
              <button className="cal-arr" onClick={goNextMonth} title="次の月">›</button>
            </div>
          </div>

          <div className="cal-grid">
            {DOW_JP.map((d, i) => (
              <div key={d} className={`cal-dow ${i===0?'sun':''} ${i===6?'sat':''}`}>{d} · {DOW_EN[i]}</div>
            ))}
            {cells.map((c, i) => {
              const ev = EVENTS[c.key];
              return (
                <div
                  key={i}
                  className={`cal-cell ${c.other?'other':''} ${c.key===todayKey?'today':''} ${c.key===selDate?'selected':''}`}
                  onClick={() => !c.other && setSelDate(c.key)}
                >
                  <div className="cal-day">{c.day}</div>
                  {ev && (
                    <div className="cal-events">
                      <div className={`cal-ev ${ev.type}`}>{ev.time} · {ev.title}</div>
                    </div>
                  )}
                  {ev && ev.type === 'show' && (
                    <div className="cal-weather" title="晴れ">☾</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="sc-drawer">
          {selEvent ? (
            <>
              <div className="dr-date">
                4月{parseInt(selDate.slice(-2))}日<span className="dow">{DOW_JP[new Date(selDate).getDay()]}曜日</span>
              </div>
              <div className="dr-sub">{selDate} · {TYPE_META[selEvent.type].jp}</div>

              <div className="ev-card">
                <div className="ev-time">{selEvent.time}{selEvent.duration?` — ${selEvent.duration}分`:''}</div>
                <div className="ev-title">{selEvent.title}</div>
                <div className="ev-venue">📍 {selEvent.venue}</div>
                <div className="ev-meta">
                  {selEvent.drones && <span>Drones<b>{selEvent.drones}</b></span>}
                  {selEvent.audience && <span>観客<b>{(selEvent.audience/10000).toFixed(1)}万</b></span>}
                </div>
              </div>

              {selEvent.weather && (
                <div className="sect">
                  <div className="sect-head"><span>Weather Forecast</span><span className="jp">天候予報</span></div>
                  <div className="wx-panel">
                    <div className="wx-item"><div className="wx-k">Temp</div><div className="wx-v">{selEvent.weather.temp}°</div></div>
                    <div className="wx-item"><div className="wx-k">Wind</div><div className="wx-v ok">{selEvent.weather.wind}<span style={{fontSize:10,color:'var(--text-3)'}}> m/s</span></div></div>
                    <div className="wx-item"><div className="wx-k">Vis</div><div className="wx-v ok" style={{fontSize:13}}>{selEvent.weather.visibility}</div></div>
                    <div className="wx-item"><div className="wx-k">Hum</div><div className="wx-v">{selEvent.weather.humidity}%</div></div>
                  </div>
                </div>
              )}

              <div className="sect">
                <div className="sect-head"><span>Programme</span><span className="jp">演目</span></div>
                <div className="row"><span className="l">振付</span><span className="v">東京湾の星座 v2.4</span></div>
                <div className="row"><span className="l">フォーメーション</span><span className="v">9 formations</span></div>
                <div className="row"><span className="l">音楽</span><span className="v">宵の口 — 久石譲 (120 BPM)</span></div>
                <div className="row"><span className="l">花火同期</span><span className="v">あり · 3箇所</span></div>
              </div>

              <div className="sect">
                <div className="sect-head"><span>Crew · {CREW.length} people</span><span className="jp">当日クルー</span></div>
                {CREW.map(c => (
                  <div key={c.name} className="crew-row">
                    <div className="crew-ava" style={{background:c.color}}>{c.initials}</div>
                    <div className="crew-info">
                      <div className="crew-name">{c.name}</div>
                      <div className="crew-role">{c.role}</div>
                    </div>
                    <div className="crew-status" style={{color: c.status==='CONFIRMED'?'var(--ok)':'var(--warn)'}}>{c.status}</div>
                  </div>
                ))}
              </div>

              {/* Phase 3-I: 自動 state summary */}
              {(() => {
                const now = new Date('2026-04-19T00:00:00+09:00'); // mock today
                const target = new Date(selDate + 'T' + (selEvent.time || '19:00') + ':00+09:00');
                const diffMs = target - now;
                const hours = Math.round(diffMs / 3600000);
                const days = Math.floor(hours / 24);
                const hRemain = hours - days * 24;
                const fleetReady = 600;
                const fleetTotal = 660;
                const audioSynced = !!selEvent.weather; // mock: weather 情報あり = 同期済みとみなす
                const weather = selEvent.weather;
                const weatherOK = weather && weather.wind < 5 && weather.visibility === '良好';
                const items = [
                  { label: 'カウントダウン', value: diffMs > 0 ? `H-${days}d ${hRemain}h` : '公演済', ok: diffMs > 0 },
                  { label: '機体稼働', value: `${fleetReady} / ${fleetTotal} 機`, ok: fleetReady >= 600 },
                  { label: '気象条件', value: weather ? (weatherOK ? '良好' : '要確認') : '未取得', ok: weatherOK },
                  { label: '音響同期', value: audioSynced ? '確認済' : '未確認', ok: audioSynced },
                ];
                return (
                  <div className="sect">
                    <div className="sect-head"><span>Pre-flight State</span><span className="jp">出発準備状況</span></div>
                    <div className="pf-grid">
                      {items.map((it, i) => (
                        <div key={i} className={'pf-item' + (it.ok ? ' ok' : ' warn')}>
                          <div className="pf-label">{it.label}</div>
                          <div className="pf-value">{it.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="sect">
                <div className="sect-head"><span>Pre-flight Checklist</span><span className="jp">離陸前確認</span></div>
                <div className="checklist">
                  {checklist.map((ci, i) => (
                    <div key={i} className={`check-item ${ci.done?'done':''}`} onClick={()=>toggleCheck(i)} style={{cursor:'pointer'}} role="button" tabIndex={0}
                         onKeyDown={e => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), toggleCheck(i))}>
                      <div className={`check-box ${ci.done?'on':''} ${ci.warn?'warn':''}`}>{ci.done?'✓':ci.warn?'!':''}</div>
                      <div style={{flex:1}}>
                        <div>{ci.label}</div>
                        {ci.note && <div style={{fontSize:10, color:'var(--text-3)', fontFamily:'var(--mono)', letterSpacing:'0.04em', marginTop:2}}>{ci.note}</div>}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:12, fontSize:11, color:'var(--text-3)', fontFamily:'"Poppins",sans-serif', letterSpacing:'0.14em'}}>
                  {checklist.filter(c => c.done).length} / {checklist.length} 完了
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="dr-date">4月{parseInt(selDate.slice(-2))}日</div>
              <div className="dr-sub">{selDate} · 予定なし</div>
              <div style={{marginTop:40, padding:'40px 20px', textAlign:'center', border:'1px dashed var(--hair)', borderRadius:10, color:'var(--text-3)', fontSize:13, lineHeight:1.8}}>
                <div style={{fontSize:32, opacity:0.3, marginBottom:10}}>○</div>
                この日は運航予定がありません<br/>
                <span style={{fontFamily:'"Poppins",sans-serif', fontSize:10, letterSpacing:'0.22em', textTransform:'uppercase', color:'var(--text-3)'}}>No events scheduled</span>
              </div>
              <button className="sc-btn primary" style={{marginTop:20, width:'100%'}} onClick={onAddEvent}>+ この日に公演を追加</button>
            </>
          )}
        </div>
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

ReactDOM.createRoot(document.getElementById('sc-root')).render(<Schedule />);
