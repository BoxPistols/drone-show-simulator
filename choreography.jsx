const { useState, useMemo, useEffect, useRef } = React;

const FORMATIONS = [
  { id:'sphere',  jp:'球体',      en:'Sphere of Stars',      dur:42, color:'#6ed3e6', drones:660, desc:'均等配置の球体。全機同期。' },
  { id:'helix',   jp:'単螺旋',    en:'Ascending Helix',      dur:38, color:'#d429e0', drones:660, desc:'螺旋状に昇り、観客の視線を天へ。' },
  { id:'torus',   jp:'円環',      en:'Torus Ring',           dur:36, color:'#ffb347', drones:660, desc:'ドーナツ状のトーラス面上。' },
  { id:'wave',    jp:'波紋',      en:'Ripple Grid',          dur:44, color:'#31a9c7', drones:660, desc:'格子上をサイン波が伝播。' },
  { id:'dna',     jp:'二重螺旋',  en:'Double Helix',         dur:40, color:'#98ff9e', drones:660, desc:'二本の螺旋が絡み合う。' },
  { id:'cube',    jp:'立方体',    en:'Wireframe Cube',       dur:34, color:'#ff69b4', drones:660, desc:'12本のエッジ上に配置。' },
  { id:'galaxy',  jp:'銀河',      en:'Spiral Galaxy',        dur:48, color:'#c5b3ff', drones:660, desc:'四本腕の渦巻銀河。' },
  { id:'heart',   jp:'心臓',      en:'Pulse of Love',        dur:32, color:'#ff6b7a', drones:660, desc:'パラメトリック心臓形。' },
  { id:'bear',    jp:'熊',        en:'Bear Silhouette',      dur:54, color:'#d4915c', drones:660, desc:'クマの顔のクローズアップ。頭 + 2 つの耳。フィナーレ。' },
];
const EASING = ['Linear','Ease-in','Ease-out','Ease-both','Elastic'];
const PALETTES = [
  { k:'aurora',  jp:'極光', colors:['#31a9c7','#d429e0','#98ff9e','#ffe58a'] },
  { k:'sakura',  jp:'桜',   colors:['#ffb7c5','#ff69b4','#ffffff','#e8c4ff'] },
  { k:'ember',   jp:'炎',   colors:['#ff6b35','#ffb347','#ffe58a','#d429e0'] },
  { k:'mono',    jp:'白',   colors:['#ffffff','#f0f8ff','#cfe7ff','#ffe58a'] },
  { k:'flock', jp:'星群', colors:['#31a9c7','#5b21b6','#ff69b4','#ffffff'] },
];

function fmt(s){s=Math.max(0,Math.floor(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}

// Mini preview of selected formation (CSS points)
function Preview({ formation, time, total }) {
  const canvasRef = useRef();
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr; c.height = rect.height * dpr;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;
    ctx.clearRect(0,0,W,H);

    const cx = W/2, cy = H/2;
    const R = Math.min(W, H) * 0.32;
    const N = 220; // preview-reduced
    const t = time * 0.4;
    ctx.fillStyle = formation.color;

    for (let i = 0; i < N; i++) {
      let x=0,y=0;
      const tt = i / N;
      switch(formation.id) {
        case 'sphere': {
          const phi = Math.PI * (Math.sqrt(5) - 1);
          const yy = 1 - (i / (N-1)) * 2;
          const r = Math.sqrt(1 - yy*yy);
          const th = phi * i + t;
          x = Math.cos(th) * r * R;
          y = yy * R;
          break;
        }
        case 'helix': {
          const a = tt * 6 * Math.PI * 2 + t;
          const strand = i%2===0?1:-1;
          x = Math.cos(a) * R * 0.4 * strand;
          y = (tt - 0.5) * R * 2;
          break;
        }
        case 'torus': {
          const u = (i%28)/28 * Math.PI*2 + t*0.5;
          const v = Math.floor(i/28)/(N/28) * Math.PI*2;
          x = (R*0.7 + R*0.3*Math.cos(v))*Math.cos(u);
          y = R*0.3*Math.sin(v);
          break;
        }
        case 'wave': {
          const side = Math.ceil(Math.sqrt(N));
          const ix = i%side, iz = Math.floor(i/side);
          x = (ix/side - 0.5) * R*1.8;
          const d = Math.sqrt((ix-side/2)**2 + (iz-side/2)**2);
          y = (iz/side - 0.5) * R*1.4 + Math.sin(d*0.4 + t*2)*8;
          break;
        }
        case 'dna': {
          const a = tt*5*Math.PI*2 + (i%2)*Math.PI + t;
          x = Math.cos(a)*R*0.35;
          y = (tt-0.5)*R*2;
          break;
        }
        case 'cube': {
          const s = R*0.7;
          const edges=12;
          const e = i%edges, k = Math.floor(i/edges)/(N/edges);
          const pts=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
          const connect=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
          const [a,b]=connect[e], A=pts[a], B=pts[b];
          const rot=t*0.4;
          const px=A[0]+(B[0]-A[0])*k, py=A[1]+(B[1]-A[1])*k, pz=A[2]+(B[2]-A[2])*k;
          x = (px*Math.cos(rot) - pz*Math.sin(rot)) * s;
          y = py * s * 0.8;
          break;
        }
        case 'galaxy': {
          const arm = i%4;
          const ang = tt*Math.PI*4 + (arm/4)*Math.PI*2 + t*0.3;
          const r = 6 + tt*R*0.9;
          x = Math.cos(ang)*r;
          y = Math.sin(ang)*r*0.4;
          break;
        }
        case 'heart': {
          const th = tt*Math.PI*2;
          const hx = 16*Math.pow(Math.sin(th),3);
          const hy = -(13*Math.cos(th)-5*Math.cos(2*th)-2*Math.cos(3*th)-Math.cos(4*th));
          const scl = R * 0.04;
          x = hx * scl; y = hy * scl;
          break;
        }
        case 'bear': {
          // Face close-up: big head disc + 2 ears on top. Canvas y is down-positive.
          let cx2, cy2, r2, sub, tot;
          if (i < 177)       { cx2 =  0;    cy2 =  0;    r2 = 0.58; sub = i;        tot = 177; }
          else if (i < 199)  { cx2 = -0.38; cy2 = -0.50; r2 = 0.20; sub = i - 177;  tot =  22; }
          else               { cx2 =  0.38; cy2 = -0.50; r2 = 0.20; sub = i - 199;  tot =  21; }
          const ttL = (sub + 0.5) / tot;
          const theta = sub * 2.399963 + t * 0.3;
          x = cx2 * R + Math.sqrt(ttL) * r2 * R * Math.cos(theta);
          y = cy2 * R + Math.sqrt(ttL) * r2 * R * Math.sin(theta);
          break;
        }
      }
      // rotate
      const sz = 2 + Math.sin(i*0.3 + t*2)*0.8;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(cx + x, cy + y, sz, 0, Math.PI*2);
      ctx.fill();
    }
    // subtle glow layer
    ctx.globalAlpha = 0.15;
    ctx.filter = 'blur(6px)';
    ctx.drawImage(c, 0, 0, W, H);
    ctx.filter = 'none';
  }, [formation, time]);

  return <canvas ref={canvasRef} style={{width:'100%',height:'100%'}}/>;
}

function Choreo() {
  const [selIdx, setSelIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [time, setTime] = useState(0);
  const [formations, setFormations] = useState(FORMATIONS.map(f => ({...f, easing:'Ease-both', paletteOverride:null, altitude:60, spread:55, speed:1.0})));
  const totalDur = formations.reduce((s,f)=>s+f.dur,0);
  const starts = useMemo(() => { let t=0; return formations.map(f=>{const s=t; t+=f.dur; return s;}); },[formations]);

  // animation time loop
  useEffect(() => {
    if (!playing) return;
    let raf, last=performance.now();
    const tick = (now) => {
      const dt = (now-last)/1000; last = now;
      setTime(t => (t + dt) % totalDur);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, totalDur]);

  // follow playhead to select current formation
  useEffect(() => {
    let idx = 0;
    for (let i = 0; i < starts.length; i++) if (time >= starts[i]) idx = i;
    if (idx !== selIdx) setSelIdx(idx);
  }, [time]);

  const sel = formations[selIdx];
  const localTime = time - starts[selIdx];

  const updateSel = (patch) => {
    setFormations(fs => fs.map((f,i) => i===selIdx ? {...f, ...patch} : f));
  };

  // --- Mock interactions ---
  const [toast, setToast] = useState('');
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(t => t === msg ? '' : t), 2400);
  };
  const onExport = () => {
    const blob = new Blob([JSON.stringify(formations, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'astra-flock-programme.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`書出完了: ${formations.length} 演目 → astra-flock-programme.json`);
  };
  const onSimulate = () => {
    setPlaying(true); setTime(0);
    showToast('シミュ実行: タイムラインを先頭から再生');
  };
  const onSave = () => {
    try { localStorage.setItem('astra-flock-programme', JSON.stringify(formations)); } catch(e){}
    showToast(`保存: ${formations.length} 演目を localStorage に記録 (mock)`);
  };
  const onMusicSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setTime(ratio * totalDur);
  };

  return (
    <>
      <div className="ch-head">
        <div>
          <div className="jp">振付エディタ</div>
          <div className="en">Choreography — Tonight's Programme</div>
        </div>
        <div className="ch-meta">
          <div><div className="k">Formations</div><div className="v">{formations.length}</div></div>
          <div><div className="k">Duration</div><div className="v">{fmt(totalDur)}</div></div>
          <div><div className="k">Drones</div><div className="v">660</div></div>
          <div className="ch-actions">
            <button className="ch-btn ghost" onClick={onExport}>書出 .json</button>
            <button className="ch-btn" onClick={onSimulate}>シミュ実行</button>
            <button className="ch-btn primary" onClick={onSave}>保存</button>
          </div>
        </div>
      </div>

      <div className="ch-body">
        <div className="ch-left">
          <div className="ch-list-head"><span>Programme</span><span className="jp">演目</span></div>
          {formations.map((f, i) => (
            <div key={f.id} className={'form-item'+(i===selIdx?' active':'')} onClick={()=>{setSelIdx(i); setTime(starts[i]+0.01);}}>
              <div className="fi-num">{String(i+1).padStart(2,'0')}</div>
              <div>
                <div className="fi-jp">{f.jp}</div>
                <div className="fi-en">{f.en}</div>
              </div>
              <div className="fi-dur">{fmt(f.dur)}</div>
            </div>
          ))}
        </div>

        <div className="ch-center">
          <div className="ch-preview">
            <Preview formation={sel} time={localTime} total={sel.dur}/>
            <div className="ch-preview-ui">
              <div className="cp-label">
                {sel.jp}
                <span className="en">{sel.en}</span>
              </div>
              <div className="cp-counter">
                {String(selIdx+1).padStart(2,'0')} / {String(formations.length).padStart(2,'0')} ・ {fmt(localTime)} / {fmt(sel.dur)}
              </div>
            </div>
          </div>

          <div className="ch-timeline">
            <div className="tl-head">
              <div className="tl-title">プログラム・タイムライン<span className="en">Programme Timeline</span></div>
              <div className="tl-time">{fmt(time)} / {fmt(totalDur)}</div>
            </div>
            <div className="tl-tracks">
              <div className="tl-ruler">
                {Array.from({length: Math.floor(totalDur/30)+1}, (_,i) => (
                  <div key={i} className="tl-tick" style={{left: (i*30/totalDur*100)+'%'}}>{fmt(i*30)}</div>
                ))}
              </div>
              <div className="tl-row">
                {formations.map((f, i) => {
                  const left = (starts[i]/totalDur)*100;
                  const width = (f.dur/totalDur)*100;
                  return (
                    <div key={f.id} className={'tl-block'+(i===selIdx?' active':'')}
                      style={{ left: left+'%', width: width+'%', background: f.color }}
                      onClick={() => { setSelIdx(i); setTime(starts[i]+0.01); }}>
                      {String(i+1).padStart(2,'0')} {f.jp}
                    </div>
                  );
                })}
                <div className="tl-playhead" style={{left: (time/totalDur)*100+'%'}}/>
              </div>
              <div style={{fontFamily:'var(--mincho)', fontSize:10, color:'var(--text-3)', marginTop: 4, letterSpacing:'0.08em'}}>音楽トラック ・ Music <span style={{color:'var(--text-3)',fontSize:9,marginLeft:6}}>(click でシーク)</span></div>
              <div className="music-track" onClick={onMusicSeek} style={{cursor:'pointer'}} title="Click to seek">
                <svg viewBox="0 0 800 36" preserveAspectRatio="none">
                  {Array.from({length:200},(_,i)=>{
                    const h = 6 + Math.abs(Math.sin(i*0.27)*Math.cos(i*0.11))*24;
                    return <rect key={i} x={i*4} y={18-h/2} width={2} height={h} fill="rgba(255,255,255,0.35)"/>;
                  })}
                </svg>
              </div>
            </div>
            <div className="tl-transport">
              <button className="tl-tbtn" onClick={()=>{const i=Math.max(0,selIdx-1); setSelIdx(i); setTime(starts[i]+0.01);}}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3 L5 8 L12 13 Z M4 3 L4 13"/></svg>
              </button>
              <button className="tl-tbtn play" onClick={()=>setPlaying(p=>!p)}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  {playing ? <path d="M4 3 L7 3 L7 13 L4 13 Z M9 3 L12 3 L12 13 L9 13 Z"/> : <path d="M4 3 L13 8 L4 13 Z"/>}
                </svg>
              </button>
              <button className="tl-tbtn" onClick={()=>{const i=Math.min(formations.length-1,selIdx+1); setSelIdx(i); setTime(starts[i]+0.01);}}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 3 L11 8 L4 13 Z M12 3 L12 13"/></svg>
              </button>
              <div style={{flex:1}}/>
              <div style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--text-3)',letterSpacing:'0.1em'}}>120 BPM ・ 東京湾 ・ 2026-04-28 19:00 JST</div>
            </div>
          </div>
        </div>

        <div className="ch-right">
          <div className="cr-title"><span className="num">{String(selIdx+1).padStart(2,'0')}</span>{sel.jp}</div>
          <div className="cr-sub">{sel.en}</div>

          <div className="cr-section">
            <div className="cr-sec-head"><span>Description</span><span className="jp">説明</span></div>
            <div style={{fontSize:12, lineHeight:1.6, color:'var(--text-2)'}}>{sel.desc}</div>
          </div>

          <div className="cr-section">
            <div className="cr-sec-head"><span>Parameters</span><span className="jp">パラメータ</span></div>
            <div className="cr-field">
              <div className="cr-label">継続時間 Duration<span className="val">{sel.dur}s</span></div>
              <input type="range" className="cr-slider" min="10" max="90" value={sel.dur} onChange={e=>updateSel({dur:+e.target.value})}/>
            </div>
            <div className="cr-field">
              <div className="cr-label">高度 Altitude<span className="val">{sel.altitude}m</span></div>
              <input type="range" className="cr-slider" min="30" max="150" value={sel.altitude} onChange={e=>updateSel({altitude:+e.target.value})}/>
            </div>
            <div className="cr-field">
              <div className="cr-label">広がり Spread<span className="val">{sel.spread}m</span></div>
              <input type="range" className="cr-slider" min="20" max="120" value={sel.spread} onChange={e=>updateSel({spread:+e.target.value})}/>
            </div>
            <div className="cr-field">
              <div className="cr-label">遷移速度 Transition<span className="val">{sel.speed.toFixed(1)}×</span></div>
              <input type="range" className="cr-slider" min="0.3" max="2.5" step="0.1" value={sel.speed} onChange={e=>updateSel({speed:+e.target.value})}/>
            </div>
          </div>

          <div className="cr-section">
            <div className="cr-sec-head"><span>Easing</span><span className="jp">補間曲線</span></div>
            <div className="cr-seg">
              {EASING.map(e => (
                <button key={e} className={sel.easing===e?'on':''} onClick={()=>updateSel({easing:e})}>{e}</button>
              ))}
            </div>
          </div>

          <div className="cr-section">
            <div className="cr-sec-head"><span>Palette Override</span><span className="jp">色指定</span></div>
            <div className="cr-swatches">
              <div className={'cr-sw'+(sel.paletteOverride===null?' on':'')}
                   style={{background:'repeating-linear-gradient(45deg, rgba(255,255,255,0.15) 0 3px, transparent 3px 6px)'}}
                   title="Inherit" onClick={()=>updateSel({paletteOverride:null})}/>
              {PALETTES.map(p => (
                <div key={p.k} className={'cr-sw'+(sel.paletteOverride===p.k?' on':'')}
                  style={{background: `linear-gradient(135deg, ${p.colors[0]}, ${p.colors[1]} 50%, ${p.colors[2]})`}}
                  title={p.jp} onClick={()=>updateSel({paletteOverride:p.k})}/>
              ))}
            </div>
          </div>

          <div className="cr-section">
            <div className="cr-sec-head"><span>Drone Allocation</span><span className="jp">機体配分</span></div>
            <div className="cr-dronecount">
              <span className="l">配置機数</span>
              <span className="v">{sel.drones} / 660 機</span>
            </div>
            <div style={{fontFamily:'var(--mono)',fontSize:10, color:'var(--text-3)', marginTop:8, lineHeight:1.7, letterSpacing:'0.04em'}}>
              AS-001 … AS-660 ・ 全機割当<br/>
              予備機: AS-601以降 18機
            </div>
          </div>
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

ReactDOM.createRoot(document.getElementById('ch-root')).render(<Choreo />);
