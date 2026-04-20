const { useState, useMemo, useEffect, useRef } = React;

const FORMATIONS = [
  { id:'sphere',  jp:'球体',      en:'Sphere of Stars',      dur:42, color:'#6ed3e6', drones:660, desc:'均等配置の球体。全機同期。' },
  { id:'helix',   jp:'単螺旋',    en:'Ascending Helix',      dur:38, color:'#d429e0', drones:660, desc:'螺旋状に昇り、観客の視線を天へ。' },
  { id:'torus',   jp:'円環',      en:'Torus Ring',           dur:36, color:'#ffb347', drones:660, desc:'ドーナツ状のトーラス面上。' },
  { id:'wave',    jp:'波紋',      en:'Ripple Grid',          dur:44, color:'#31a9c7', drones:660, desc:'格子上をサイン波が伝播。' },
  { id:'bear',    jp:'熊',        en:'Bear Silhouette',      dur:54, color:'#d4915c', drones:660, desc:'中盤のひと息。クマの顔アップ。観客との視線交換。' },
  { id:'dna',     jp:'二重螺旋',  en:'Double Helix',         dur:40, color:'#98ff9e', drones:660, desc:'二本の螺旋が絡み合う。' },
  { id:'cube',    jp:'立方体',    en:'Wireframe Cube',       dur:34, color:'#ff69b4', drones:660, desc:'12本のエッジ上に配置。' },
  { id:'heart',   jp:'心臓',      en:'Pulse of Love',        dur:32, color:'#ff6b7a', drones:660, desc:'パラメトリック心臓形。' },
  { id:'galaxy',  jp:'銀河',      en:'Spiral Galaxy',        dur:48, color:'#c5b3ff', drones:660, desc:'最終演目。四本腕の渦巻銀河が閉幕を飾る。' },
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

// Easing curves — same set as the EASING selector
const EASING_FN = {
  'Linear':   t => t,
  'Ease-in':  t => t * t,
  'Ease-out': t => 1 - (1-t) * (1-t),
  'Ease-both':t => t * t * (3 - 2*t),
  'Elastic':  t => {
    if (t === 0 || t === 1) return t;
    const c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -10*t) * Math.sin((t*10 - 0.75) * c4) + 1;
  },
};

// Mini preview — uses the EXACT same 3D target positions as the main Three.js
// view (via window.AstraFlock from formations.js), projected to 2D with a
// Y-axis rotation + simple perspective so the look stays consistent.
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
    ctx.clearRect(0, 0, W, H);

    const af = window.AstraFlock;
    // 追加・複製された formation は typeId でベース shape を参照する (id は重複する)
    const lookup = formation.typeId || formation.id;
    const fdata = af && af.FORMATIONS.find(f => f.id === lookup);
    if (!fdata || !fdata.targets) return;
    const targets = fdata.targets;
    const N_total = af.DRONE_COUNT;

    // Right-panel controls → projection modifiers
    const altOffset  = ((formation.altitude || 60) - 60);           // m
    const spreadScale = (formation.spread || 55) / 55;
    const trans = formation.speed || 1;
    const N_draw = Math.max(40, Math.round(N_total * (formation.drones || 660) / 660));

    // Easing pulse on point size
    const progress = total > 0 ? (time % total) / total : 0;
    const easeFn = EASING_FN[formation.easing] || EASING_FN['Ease-both'];
    const pulseSz = 0.82 + easeFn(progress) * 0.34;

    // Camera + projection — rotate around world Y
    const cx = W/2, cy = H/2 + 12;
    const worldCenter = 60;
    const R = Math.min(W, H) * 0.45;
    const scale = (R / 70) * spreadScale;
    const rotY = time * 0.4 * trans;
    const camDist = 220;
    const sinR = Math.sin(rotY), cosR = Math.cos(rotY);

    // Palette Override → 色置換
    const ov = PALETTES.find(p => p.k === formation.paletteOverride);
    const baseColor = ov ? ov.colors[0] : formation.color;
    const accentColor = ov ? ov.colors[1] : formation.color;

    // Project all drones with depth, then paint back-to-front
    const points = [];
    for (let i = 0; i < N_draw; i++) {
      const wx = targets[i*3];
      const wy = targets[i*3+1] + altOffset;
      const wz = targets[i*3+2];
      const rx = wx * cosR + wz * sinR;
      const rz = -wx * sinR + wz * cosR;
      const persp = camDist / Math.max(1, camDist - rz);
      const sx = cx + rx * scale * persp;
      const sy = cy - (wy - worldCenter) * scale * persp;
      points.push({ sx, sy, depth: rz, persp, i });
    }
    points.sort((a, b) => a.depth - b.depth);

    for (const p of points) {
      ctx.fillStyle = (ov && p.i % 4 === 0) ? accentColor : baseColor;
      const twinkle = 0.7 + Math.sin(p.i * 0.3 + rotY * 2) * 0.3;
      const sz = 1.9 * pulseSz * twinkle * Math.max(0.55, p.persp);
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, sz, 0, Math.PI*2);
      ctx.fill();
    }

    // Soft glow (adds volumetric feel similar to AdditiveBlending in show.js)
    ctx.globalAlpha = 0.18;
    ctx.filter = 'blur(5px)';
    ctx.drawImage(c, 0, 0, W, H);
    ctx.filter = 'none';
  }, [formation, time]);

  return <canvas ref={canvasRef} style={{width:'100%',height:'100%'}}/>;
}


function Choreo() {
  const [selIdx, setSelIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [time, setTime] = useState(0);
  // typeId: window.AstraFlock.FORMATIONS で shape 関数を参照する用のベース id
  // _uid:   React key 用のインスタンス識別子 (複製/追加後に id が重複しても衝突しない)
  const [formations, setFormations] = useState(FORMATIONS.map((f, i) => ({
    ...f, typeId: f.id, _uid: `init-${i}-${f.id}`,
    easing:'Ease-both', paletteOverride:null, altitude:60, spread:55, speed:1.0
  })));
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
  const moveFormation = (i, dir) => {
    const to = i + dir;
    if (to < 0 || to >= formations.length) return;
    setFormations(fs => {
      const arr = [...fs];
      [arr[i], arr[to]] = [arr[to], arr[i]];
      return arr;
    });
    if (selIdx === i) setSelIdx(to);
    else if (selIdx === to) setSelIdx(i);
  };

  // --- CRUD: formation add / duplicate / delete ---
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const addFormation = (baseId) => {
    const template = FORMATIONS.find(f => f.id === baseId);
    if (!template) return;
    const newF = {
      ...template, typeId: template.id, _uid: `new-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      easing:'Ease-both', paletteOverride:null, altitude:60, spread:55, speed:1.0, drones:660,
    };
    setFormations(fs => {
      const arr = [...fs];
      arr.splice(selIdx + 1, 0, newF);
      return arr;
    });
    setSelIdx(selIdx + 1);
    setAddPickerOpen(false);
    showToast(`${template.jp} を追加しました`);
  };
  const duplicateFormation = () => {
    const cur = formations[selIdx];
    if (!cur) return;
    const dup = { ...cur, _uid: `dup-${Date.now()}-${Math.random().toString(36).slice(2,6)}` };
    setFormations(fs => {
      const arr = [...fs];
      arr.splice(selIdx + 1, 0, dup);
      return arr;
    });
    setSelIdx(selIdx + 1);
    showToast(`${cur.jp} を複製しました`);
  };
  const deleteFormation = () => {
    if (formations.length <= 1) {
      showToast('最低 1 演目は必要です');
      return;
    }
    const removed = formations[selIdx];
    setFormations(fs => fs.filter((_, i) => i !== selIdx));
    const newIdx = Math.max(0, Math.min(selIdx, formations.length - 2));
    setSelIdx(newIdx);
    showToast(`${removed.jp} を削除しました`);
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
  const fileInputRef = useRef();
  const onImportClick = () => fileInputRef.current?.click();
  const onFileChosen = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data) || data.length === 0) {
          showToast('不正なファイル: 配列が空か、配列でない');
          return;
        }
        // 旧形式 (typeId/_uid なし) と新形式どちらも受けられるよう正規化
        // 未知の typeId は window.AstraFlock.FORMATIONS に shape 関数がないため
        // Preview で空点群になる → sphere にフォールバック
        const knownIds = new Set(window.AstraFlock?.FORMATIONS?.map(f => f.id) || []);
        let fallbackCount = 0;
        const normalized = data.map((f, i) => {
          if (!f || !f.id) throw new Error(`演目 #${i+1} に id がありません`);
          const rawType = f.typeId || f.id;
          const typeId = knownIds.has(rawType) ? rawType : 'sphere';
          if (typeId !== rawType) fallbackCount++;
          return {
            ...f,
            typeId,
            _uid: `imported-${Date.now()}-${i}`,
            easing: f.easing || 'Ease-both',
            paletteOverride: f.paletteOverride ?? null,
            altitude: typeof f.altitude === 'number' ? f.altitude : 60,
            spread: typeof f.spread === 'number' ? f.spread : 55,
            speed: typeof f.speed === 'number' ? f.speed : 1.0,
            drones: typeof f.drones === 'number' ? f.drones : 660,
            dur: typeof f.dur === 'number' ? f.dur : 30,
            jp: f.jp || '新規',
            en: f.en || 'New',
            color: f.color || '#6ed3e6',
            desc: f.desc || '',
          };
        });
        setFormations(normalized);
        setSelIdx(0);
        setTime(0);
        setAddPickerOpen(false);
        const warning = fallbackCount > 0 ? ` ・${fallbackCount} 件は未知形状を sphere にフォールバック` : '';
        showToast(`読込完了: ${normalized.length} 演目${warning}`);
      } catch (err) {
        showToast('読込エラー: ' + err.message);
      } finally {
        e.target.value = '';
      }
    };
    reader.onerror = () => showToast('ファイル読込失敗');
    reader.readAsText(file);
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
            <button className="ch-btn ghost" onClick={onImportClick}>読込 .json</button>
            <button className="ch-btn ghost" onClick={onExport}>書出 .json</button>
            <button className="ch-btn" onClick={onSimulate}>シミュ実行</button>
            <button className="ch-btn primary" onClick={onSave}>保存</button>
            <input type="file" accept="application/json,.json" ref={fileInputRef} onChange={onFileChosen} style={{display:'none'}} aria-hidden="true"/>
          </div>
        </div>
      </div>

      <div className="ch-body">
        <div className="ch-left">
          <div className="ch-list-head">
            <span>Programme<span className="jp">演目</span></span>
            <div className="ch-list-actions">
              <button className="ch-icon-btn" onClick={duplicateFormation} title="選択中を複製" aria-label="複製">⎘</button>
              <button className="ch-icon-btn danger" onClick={deleteFormation} disabled={formations.length <= 1} title="選択中を削除" aria-label="削除">✕</button>
              <button className="ch-icon-btn primary" onClick={()=>setAddPickerOpen(v => !v)} title="演目を追加" aria-label="追加" aria-expanded={addPickerOpen}>+</button>
            </div>
          </div>
          {addPickerOpen && (
            <div className="ch-add-picker" role="menu">
              <div className="cap-label">形状を選んで追加</div>
              {FORMATIONS.map(f => (
                <button key={f.id} className="cap-item" onClick={()=>addFormation(f.id)} style={{borderLeft:`3px solid ${f.color}`}}>
                  <span className="jp">{f.jp}</span>
                  <span className="en">{f.en.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          )}
          {formations.map((f, i) => (
            <div key={f._uid || f.id} className={'form-item'+(i===selIdx?' active':'')} onClick={()=>{setSelIdx(i); setTime(starts[i]+0.01);}}>
              <div className="fi-num">{String(i+1).padStart(2,'0')}</div>
              <div>
                <div className="fi-jp">{f.jp}</div>
                <div className="fi-en">{f.en}</div>
              </div>
              <div className="fi-dur">{fmt(f.dur)}</div>
              <div className="fi-move" onClick={e=>e.stopPropagation()}>
                <button disabled={i===0} onClick={()=>moveFormation(i,-1)} aria-label={`${f.jp} を上へ`} title="上へ">↑</button>
                <button disabled={i===formations.length-1} onClick={()=>moveFormation(i,+1)} aria-label={`${f.jp} を下へ`} title="下へ">↓</button>
              </div>
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
                    <div key={f._uid || f.id} className={'tl-block'+(i===selIdx?' active':'')}
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
            <input type="range" className="cr-slider" min="60" max="660" step="10" value={sel.drones} onChange={e=>updateSel({drones:+e.target.value})} style={{marginTop:8}}/>
            <div style={{fontFamily:'var(--mono)',fontSize:10, color:'var(--text-3)', marginTop:8, lineHeight:1.7, letterSpacing:'0.04em'}}>
              AS-001 … AS-{String(sel.drones).padStart(3,'0')} ・ {sel.drones === 660 ? '全機割当' : `${sel.drones}機割当`}<br/>
              予備機: AS-{String(sel.drones+1).padStart(3,'0')}以降 {660 - sel.drones}機
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
