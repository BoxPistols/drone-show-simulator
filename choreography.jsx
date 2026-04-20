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
// Fleet availability snapshot — window.AstraFlock.FLEET から参照。
// ハードコード fallback は formations.js がまだ読み込まれていない想定外ケース用。
const _FLEET = (typeof window !== 'undefined' && window.AstraFlock?.FLEET) || {
  total: 660, available: 600, maint: 10, reservable: 50,
};
const FLEET_TOTAL = _FLEET.total;
const FLEET_AVAILABLE = _FLEET.available;
const FLEET_MAINT = _FLEET.maint;
const FLEET_OTHER = _FLEET.reservable;

const EASING = ['Linear','Ease-in','Ease-out','Ease-both','Elastic'];
const PALETTES = [
  { k:'aurora',  jp:'極光', colors:['#31a9c7','#d429e0','#98ff9e','#ffe58a'] },
  { k:'sakura',  jp:'桜',   colors:['#ffb7c5','#ff69b4','#ffffff','#e8c4ff'] },
  { k:'ember',   jp:'炎',   colors:['#ff6b35','#ffb347','#ffe58a','#d429e0'] },
  { k:'mono',    jp:'白',   colors:['#ffffff','#f0f8ff','#cfe7ff','#ffe58a'] },
  { k:'flock', jp:'星群', colors:['#31a9c7','#5b21b6','#ff69b4','#ffffff'] },
];

function fmt(s){s=Math.max(0,Math.floor(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}

// Live eased value readout ("t=0.42 → 0.61") for the current easing + progress.
// EASING_FN は下で宣言されるが、この関数は render 中にのみ呼ばれるため OK。
function fmtEaseLive(time, total, easingName) {
  if (!total) return '';
  const t = (time % total) / total;
  const fn = EASING_FN[easingName] || (x => x);
  const v = fn(t);
  return `t=${t.toFixed(2)} → ${v.toFixed(2)}`;
}

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
    // easing カーブを点サイズ+全体不透明度に反映。range 0.55..1.45 で差異を知覚しやすく
    const easedV = easeFn(progress);
    const pulseSz = 0.55 + easedV * 0.9;
    const pulseAlpha = 0.55 + easedV * 0.4; // 0.55..0.95

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
      ctx.globalAlpha = pulseAlpha;
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

  // --- Phase 2-G: BPM + beat grid ---
  const [bpm, setBpm] = useState(120);
  const beatsPerSec = bpm / 60;

  // --- Phase 2-F + G: drag block handle to snap start-time to beats ---
  // 演目 block の左端ハンドルを左右にドラッグ → 直前演目の dur を伸縮して
  // 開始位置を調整。BPM が設定されていれば beat にスナップする。
  const dragRef = useRef(null);
  const MIN_DUR = 5;
  const SNAP_BEATS = 0.2; // beat 単位のスナップしきい値
  const onHandlePointerDown = (i, e) => {
    if (i === 0) return;
    e.stopPropagation();
    e.preventDefault();
    const track = e.currentTarget.closest('.tl-row') || e.currentTarget.parentElement;
    dragRef.current = {
      idx: i,
      startX: e.clientX,
      trackWidth: track.getBoundingClientRect().width,
      origPrevDur: formations[i - 1].dur,
      prevStart: starts[i - 1],
      totalDurAtStart: formations.reduce((s, f) => s + f.dur, 0),
    };
  };
  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dtSec = (dx / d.trackWidth) * d.totalDurAtStart;
      let newPrevDur = d.origPrevDur + dtSec;
      // Snap: block の新しい start が beat の近傍ならスナップ
      const candidateStart = d.prevStart + newPrevDur;
      const beatAt = candidateStart * beatsPerSec;
      const nearest = Math.round(beatAt);
      if (Math.abs(beatAt - nearest) < SNAP_BEATS) {
        const snappedStart = nearest / beatsPerSec;
        newPrevDur = snappedStart - d.prevStart;
      }
      newPrevDur = Math.max(MIN_DUR, newPrevDur);
      setFormations(fs => fs.map((f, idx) =>
        idx === d.idx - 1 ? { ...f, dur: newPrevDur } : f
      ));
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [beatsPerSec]);

  // --- CRUD: formation add / duplicate / delete ---
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  // 新規 formation 生成用の _uid ファクトリ (crypto.randomUUID が使えるなら使う)
  const makeUid = (prefix) => {
    const rand = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
    return `${prefix}-${rand}`;
  };
  // 挿入後に time を新 formation の開始位置にシークして、
  // playing=true の場合に auto-follow で selIdx が即リセットされるのを防ぐ
  const addFormation = (baseId) => {
    const template = FORMATIONS.find(f => f.id === baseId);
    if (!template) return;
    const newStart = starts[selIdx] + formations[selIdx].dur;
    const newF = {
      ...template, typeId: template.id, _uid: makeUid('new'),
      easing:'Ease-both', paletteOverride:null, altitude:60, spread:55, speed:1.0,
    };
    setFormations(fs => {
      const arr = [...fs];
      arr.splice(selIdx + 1, 0, newF);
      return arr;
    });
    setSelIdx(selIdx + 1);
    setTime(newStart + 0.01);
    setAddPickerOpen(false);
    showToast(`${template.jp} を追加しました`);
  };
  const duplicateFormation = () => {
    const cur = formations[selIdx];
    if (!cur) return;
    const newStart = starts[selIdx] + cur.dur;
    const dup = { ...cur, _uid: makeUid('dup') };
    setFormations(fs => {
      const arr = [...fs];
      arr.splice(selIdx + 1, 0, dup);
      return arr;
    });
    setSelIdx(selIdx + 1);
    setTime(newStart + 0.01);
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
    // Phase 3-J: show 全体 (formations + BPM + audio metadata) を version 付きで書出
    const payload = {
      schema: 'astra-flock-show/1',
      exportedAt: new Date().toISOString(),
      meta: {
        bpm,
        fleet: { total: FLEET_TOTAL, available: FLEET_AVAILABLE },
      },
      audio: audio ? { name: audio.name, duration: audio.duration } : null,
      formations,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.href = url; a.download = `astra-flock-show-${stamp}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    const audioTag = audio ? ` + 音源 meta` : '';
    showToast(`書出完了: ${formations.length} 演目 + BPM${audioTag}`);
  };

  // --- 機体別フライトパス export (実機連携用) ---
  // 各 drone の keyframes 列 ({t, x, y, z}) を演目数分出力。補間は受け側で行う想定。
  const onExportFlightPath = () => {
    const af = window.AstraFlock;
    if (!af) { showToast('formations.js が未ロード'); return; }
    const drones = [];
    for (let i = 0; i < af.DRONE_COUNT; i++) {
      const keyframes = [];
      let startT = 0;
      for (let fIdx = 0; fIdx < formations.length; fIdx++) {
        const f = formations[fIdx];
        const shape = af.FORMATIONS.find(s => s.id === (f.typeId || f.id));
        if (!shape || !shape.targets) continue;
        keyframes.push({
          t: +startT.toFixed(2),
          x: +shape.targets[i*3].toFixed(2),
          y: +shape.targets[i*3+1].toFixed(2),
          z: +shape.targets[i*3+2].toFixed(2),
          formation: f.typeId || f.id,
        });
        startT += f.dur;
      }
      drones.push({
        id: `AS-${String(i+1).padStart(3,'0')}`,
        idx: i,
        assigned: i < (formations[0]?.drones || FLEET_TOTAL),
        keyframes,
      });
    }
    const payload = {
      schema: 'astra-flock-flightpath/1',
      exportedAt: new Date().toISOString(),
      totalDuration: +formations.reduce((s,f) => s+f.dur, 0).toFixed(2),
      bpm,
      fleet: { total: FLEET_TOTAL, available: FLEET_AVAILABLE },
      audio: audio ? { name: audio.name, duration: audio.duration } : null,
      drones,
    };
    const blob = new Blob([JSON.stringify(payload)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.href = url; a.download = `astra-flock-flightpath-${stamp}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    const sizeKB = Math.round(blob.size / 1024);
    showToast(`機体書出完了: ${drones.length} 機 × ${formations.length} KF ≈ ${sizeKB}KB`);
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
        // show-schema.js の normalizeShow() に委譲 (test/show-schema.test.mjs で検証済)
        const knownIds = window.AstraFlock?.FORMATIONS?.map(f => f.id) || [];
        const res = window.AstraFlockSchema.normalizeShow(data, knownIds);
        if (!res.ok) { showToast('不正なファイル: ' + res.error); return; }
        // React key 用 _uid はここで付与 (schema は純粋関数のため _uid は含めない)
        const stamp = Date.now();
        const normalized = res.formations.map((f, i) => ({ ...f, _uid: `imported-${stamp}-${i}` }));
        setFormations(normalized);
        setSelIdx(0);
        seekTo(0);
        setAddPickerOpen(false);
        if (res.bpm !== null) setBpm(res.bpm);
        const audioMetaMsg = res.audio?.name ? ` ・音源ヒント: ${res.audio.name}` : '';
        const warning = res.fallbackCount > 0 ? ` ・${res.fallbackCount} 件は未知形状を sphere にフォールバック` : '';
        const bpmMsg = res.bpm !== null ? ` ・BPM=${res.bpm}` : '';
        showToast(`読込完了: ${normalized.length} 演目${bpmMsg}${audioMetaMsg}${warning}`);
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
    setPlaying(true); seekTo(0);
    showToast('シミュ実行: タイムラインを先頭から再生');
  };
  const onSave = () => {
    try { localStorage.setItem('astra-flock-programme', JSON.stringify(formations)); } catch(e){}
    showToast(`保存: ${formations.length} 演目を localStorage に記録 (mock)`);
  };

  // --- Named presets in localStorage ---
  const PRESETS_KEY = 'astra-flock-presets';
  const [presets, setPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PRESETS_KEY) || '{}'); }
    catch (e) { return {}; }
  });
  const [presetPanelOpen, setPresetPanelOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const writePresets = (next) => {
    try { localStorage.setItem(PRESETS_KEY, JSON.stringify(next)); } catch (e) {}
    setPresets(next);
  };
  const saveCurrentAs = () => {
    const name = presetName.trim();
    if (!name) return;
    // 既存名なら上書き確認 (silent overwrite でプリセットが消えるのを防ぐ)
    if (presets[name] && !window.confirm(`"${name}" は既に存在します。上書きしますか?`)) {
      return;
    }
    const next = { ...presets, [name]: { savedAt: Date.now(), formations } };
    writePresets(next);
    setPresetName('');
    const verb = presets[name] ? '上書き' : '保存';
    showToast(`プリセット${verb}: "${name}"`);
  };
  const loadPreset = (name) => {
    const p = presets[name];
    if (!p || !Array.isArray(p.formations)) return;
    const restored = p.formations.map((f, i) => ({
      ...f,
      typeId: f.typeId || f.id,
      _uid: `preset-${Date.now()}-${i}`,
    }));
    setFormations(restored);
    setSelIdx(0);
    seekTo(0);
    setPresetPanelOpen(false);
    showToast(`読込: "${name}" (${restored.length} 演目)`);
  };
  const deletePreset = (name) => {
    const next = { ...presets };
    delete next[name];
    writePresets(next);
    showToast(`削除: "${name}"`);
  };

  // --- Audio upload (Phase 2-D) ---
  // 音源ファイルを Web Audio API でデコードし、200 点にダウンサンプルして
  // 波形として表示する。再生同期は後続 PR (feat/waveform-sync) で対応。
  const [audio, setAudio] = useState(null); // { name, duration, samples: number[] }
  const audioInputRef = useRef();
  const audioCtxRef = useRef();
  const onAudioClick = () => audioInputRef.current?.click();
  const onAudioChosen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const arrayBuf = await file.arrayBuffer();
      const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuf);
      // 波形表示用に 200 点にダウンサンプル (peak detection)
      const channel = audioBuffer.getChannelData(0);
      const N = 200;
      const step = Math.max(1, Math.floor(channel.length / N));
      const samples = new Array(N);
      for (let i = 0; i < N; i++) {
        let peak = 0;
        const start = i * step;
        const end = Math.min(start + step, channel.length);
        for (let j = start; j < end; j++) {
          const v = Math.abs(channel[j]);
          if (v > peak) peak = v;
        }
        samples[i] = peak;
      }
      // 音源読込直後の即再生を防ぐ (プレビュー再生中に upload すると曲途中から
      // 意図せず鳴り出すのを回避)。ユーザーが明示的に再生を押すまで待機。
      setPlaying(false);
      setAudio({ name: file.name, duration: audioBuffer.duration, samples, buffer: audioBuffer });
      showToast(`音源読込: ${file.name} (${Math.round(audioBuffer.duration)}s) ・ 再生で同期開始`);
    } catch (err) {
      showToast('音源読込エラー: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };
  const clearAudio = () => {
    stopAudioSource();
    setAudio(null);
    showToast('音源を解除しました');
  };

  // --- Audio playback sync (Phase 2-E) ---
  // state.playing と programme time の変化に音源再生を追従させる。
  // 時間管理は既存の RAF tick がマスタ。音源は「頭出し起点 → 現在時刻から再生」。
  const audioSourceRef = useRef(null);
  const stopAudioSource = () => {
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch (e) {}
      try { audioSourceRef.current.disconnect(); } catch (e) {}
      audioSourceRef.current = null;
    }
  };
  const startAudioAt = (offset) => {
    if (!audio?.buffer || !audioCtxRef.current) return;
    stopAudioSource();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    if (offset >= audio.buffer.duration) return; // 音源終了後は無音のまま
    const source = ctx.createBufferSource();
    source.buffer = audio.buffer;
    source.connect(ctx.destination);
    source.start(0, Math.max(0, offset));
    audioSourceRef.current = source;
  };

  // playing / audio の変化で start/stop
  useEffect(() => {
    if (!audio) { stopAudioSource(); return; }
    if (playing) startAudioAt(time);
    else stopAudioSource();
    return () => stopAudioSource();
    // time は意図的に依存から除外 (RAF tick 毎に restart してしまうため)
    // 手動シークは seekTo 経由で直接 startAudioAt を呼ぶ
  }, [playing, audio]);

  // programme がループ (time 巻戻り) したら音源も頭出し
  const prevTimeRef = useRef(0);
  useEffect(() => {
    if (playing && audio && time < prevTimeRef.current - 1) {
      startAudioAt(time);
    }
    prevTimeRef.current = time;
  }, [time, playing, audio]);

  // マニュアルシーク: setTime と同時に音源も移動
  const seekTo = (t) => {
    setTime(t);
    if (playing && audio) startAudioAt(t);
  };
  const onMusicSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(ratio * totalDur);
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
            <button className="ch-btn ghost" onClick={()=>setPresetPanelOpen(true)}>プリセット</button>
            <button className="ch-btn ghost" onClick={onImportClick}>読込 .json</button>
            <button className="ch-btn ghost" onClick={onExport} title="演目 + BPM + 音源 meta">書出 .json</button>
            <button className="ch-btn ghost" onClick={onExportFlightPath} title="機体別フライトパス (実機連携用)">機体書出</button>
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
            <div className="ch-add-picker">
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
            <div key={f._uid || f.id} className={'form-item'+(i===selIdx?' active':'')} onClick={()=>{setSelIdx(i); seekTo(starts[i]+0.01);}}>
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
                {/* Beat grid: 細線 = beat, 太線 = bar (4 beat ごと) */}
                {bpm > 0 && Array.from(
                  {length: Math.min(2000, Math.floor(totalDur * beatsPerSec) + 1)},
                  (_, i) => {
                    const t = i / beatsPerSec;
                    if (t > totalDur) return null;
                    return (
                      <div key={'b'+i}
                           className={'tl-beat' + (i % 4 === 0 ? ' bar' : '')}
                           style={{left: (t/totalDur)*100 + '%'}} />
                    );
                  }
                )}
                {formations.map((f, i) => {
                  const left = (starts[i]/totalDur)*100;
                  const width = (f.dur/totalDur)*100;
                  return (
                    <div key={f._uid || f.id} className={'tl-block'+(i===selIdx?' active':'')}
                      style={{ left: left+'%', width: width+'%', background: f.color }}
                      onClick={() => { setSelIdx(i); seekTo(starts[i]+0.01); }}>
                      {i > 0 && (
                        <div className="tl-block-handle"
                             onPointerDown={(e) => onHandlePointerDown(i, e)}
                             title={`${f.jp} の開始位置をドラッグで調整`}
                             aria-label={`${f.jp} の開始位置`} />
                      )}
                      {String(i+1).padStart(2,'0')} {f.jp}
                    </div>
                  );
                })}
                <div className="tl-playhead" style={{left: (time/totalDur)*100+'%'}}/>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4}}>
                <div style={{fontFamily:'var(--mincho)', fontSize:10, color:'var(--text-3)', letterSpacing:'0.08em'}}>
                  {audio
                    ? <>音源 ・ {audio.name} <span style={{color:'var(--text-3)',fontSize:9,marginLeft:6,fontFamily:'var(--mono)'}}>{fmt(audio.duration)}</span></>
                    : <>音楽トラック ・ Music <span style={{color:'var(--text-3)',fontSize:9,marginLeft:6}}>(click でシーク)</span></>}
                </div>
                <div className="music-btn-row">
                  <button className="music-btn" onClick={onAudioClick}>
                    {audio ? '差替' : '+ 音源'}
                  </button>
                  {audio && (
                    <button className="music-btn danger" onClick={clearAudio}>解除</button>
                  )}
                  <input type="file" accept="audio/*" ref={audioInputRef} onChange={onAudioChosen} style={{display:'none'}} aria-hidden="true"/>
                </div>
              </div>
              <div className="music-track" onClick={onMusicSeek} style={{cursor:'pointer'}} title="Click to seek">
                <svg viewBox="0 0 800 36" preserveAspectRatio="none">
                  {(audio ? audio.samples : Array.from({length:200},(_,i)=> Math.abs(Math.sin(i*0.27)*Math.cos(i*0.11))))
                    .map((sample, i) => {
                      const h = audio ? (sample * 30 + 2) : (6 + sample * 24);
                      const progress = time / totalDur;
                      const rectProgress = i / 200;
                      const fill = audio
                        ? (rectProgress <= progress ? 'var(--moon)' : 'rgba(255,255,255,0.35)')
                        : 'rgba(255,255,255,0.35)';
                      return <rect key={i} x={i*4} y={18-h/2} width={2} height={h} fill={fill}/>;
                    })}
                </svg>
              </div>
            </div>
            <div className="tl-transport">
              <button className="tl-tbtn" onClick={()=>{const i=Math.max(0,selIdx-1); setSelIdx(i); seekTo(starts[i]+0.01);}}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3 L5 8 L12 13 Z M4 3 L4 13"/></svg>
              </button>
              <button className="tl-tbtn play" onClick={()=>setPlaying(p=>!p)}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  {playing ? <path d="M4 3 L7 3 L7 13 L4 13 Z M9 3 L12 3 L12 13 L9 13 Z"/> : <path d="M4 3 L13 8 L4 13 Z"/>}
                </svg>
              </button>
              <button className="tl-tbtn" onClick={()=>{const i=Math.min(formations.length-1,selIdx+1); setSelIdx(i); seekTo(starts[i]+0.01);}}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 3 L11 8 L4 13 Z M12 3 L12 13"/></svg>
              </button>
              <div style={{flex:1}}/>
              <div style={{display:'flex',alignItems:'center',gap:10,fontFamily:'var(--mono)',fontSize:11,color:'var(--text-3)',letterSpacing:'0.1em'}}>
                <label style={{display:'inline-flex',alignItems:'center',gap:6}}>
                  <input type="number" min="30" max="300" step="1" value={bpm}
                         onChange={e=>setBpm(Math.max(30, Math.min(300, +e.target.value || 120)))}
                         style={{width:48,padding:'3px 6px',background:'rgba(255,255,255,0.04)',border:'1px solid var(--hair)',borderRadius:4,color:'var(--text-0)',fontSize:11,fontFamily:'var(--mono)',textAlign:'right'}}
                         aria-label="BPM" />
                  <span>BPM</span>
                </label>
                <span>・ 東京湾 ・ 2026-04-28 19:00 JST</span>
              </div>
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
            <div className="cr-sec-head">
              <span>Easing</span>
              <span className="jp">補間曲線 ・ <b style={{color:'var(--moon)'}}>{fmtEaseLive(time, totalDur, sel.easing)}</b></span>
            </div>
            <div className="cr-seg cr-seg-easing">
              {EASING.map(e => {
                const fn = EASING_FN[e] || (t => t);
                // Build 24-pt path for the easing curve, SVG viewBox 0 0 40 22
                const pts = [];
                for (let i = 0; i <= 24; i++) {
                  const t = i / 24;
                  const v = Math.max(-0.3, Math.min(1.3, fn(t))); // clamp Elastic overshoot
                  pts.push(`${i===0?'M':'L'}${(t*36+2).toFixed(1)},${(19 - v*16).toFixed(1)}`);
                }
                return (
                  <button key={e} className={sel.easing===e?'on':''} onClick={()=>updateSel({easing:e})}>
                    <div className="es-label">{e}</div>
                    <svg className="es-curve" viewBox="0 0 40 22" preserveAspectRatio="none" aria-hidden="true">
                      <line x1="2" y1="19" x2="38" y2="19" stroke="currentColor" strokeWidth="0.3" opacity="0.25"/>
                      <line x1="2" y1="3" x2="38" y2="3" stroke="currentColor" strokeWidth="0.3" opacity="0.15"/>
                      <path d={pts.join(' ')} fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.85" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                );
              })}
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
              <span className="v" style={{color: sel.drones > FLEET_AVAILABLE ? 'var(--warn)' : 'var(--text-0)'}}>
                {sel.drones} / {FLEET_TOTAL} 機
              </span>
            </div>
            <input type="range" className="cr-slider" min="60" max={FLEET_TOTAL} step="10" value={sel.drones} onChange={e=>updateSel({drones:+e.target.value})} style={{marginTop:8}}/>

            <div className="cr-fleet">
              <div className="cr-fleet-row">
                <span className="l">稼働可能 Active</span>
                <span className="v ok">{FLEET_AVAILABLE}</span>
              </div>
              <div className="cr-fleet-row">
                <span className="l">充電 / 待機</span>
                <span className="v muted">{FLEET_OTHER}</span>
              </div>
              <div className="cr-fleet-row">
                <span className="l">整備中 Maintenance</span>
                <span className="v err">{FLEET_MAINT}</span>
              </div>
              {sel.drones > FLEET_AVAILABLE && (
                <div className="cr-warning">
                  ⚠ 配分 ({sel.drones}) が即時稼働可能数 ({FLEET_AVAILABLE}) を超過。
                  {sel.drones - FLEET_AVAILABLE} 機は充電/待機から招集が必要。
                </div>
              )}
            </div>

            <div style={{fontFamily:'var(--mono)',fontSize:10, color:'var(--text-3)', marginTop:10, lineHeight:1.7, letterSpacing:'0.04em'}}>
              AS-001 … AS-{String(sel.drones).padStart(3,'0')} ・ {sel.drones === FLEET_TOTAL ? '全機割当' : `${sel.drones}機割当`}<br/>
              予備機: AS-{String(sel.drones+1).padStart(3,'0')}以降 {FLEET_TOTAL - sel.drones}機
            </div>
          </div>
        </div>
      </div>
      {presetPanelOpen && (
        <div className="preset-modal" role="dialog" aria-label="プリセット管理"
             onClick={e => e.target === e.currentTarget && setPresetPanelOpen(false)}>
          <div className="pm-panel">
            <div className="pm-header">
              <div className="pm-title">プリセット<span className="en">Presets</span></div>
              <button className="pm-close" onClick={()=>setPresetPanelOpen(false)} aria-label="閉じる">×</button>
            </div>
            <div className="pm-save">
              <input type="text" className="pm-input" placeholder="プリセット名を入力..."
                     value={presetName} onChange={e=>setPresetName(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && saveCurrentAs()}
                     aria-label="プリセット名"/>
              <button className="pm-btn primary" onClick={saveCurrentAs} disabled={!presetName.trim()}>現在を保存</button>
            </div>
            <div className="pm-list">
              {Object.keys(presets).length === 0 ? (
                <div className="pm-empty">まだ保存されたプリセットはありません</div>
              ) : Object.entries(presets).sort((a,b) => b[1].savedAt - a[1].savedAt).map(([name, p]) => (
                <div key={name} className="pm-item">
                  <div className="pm-item-info">
                    <div className="pm-name">{name}</div>
                    <div className="pm-meta">
                      {p.formations?.length || 0} 演目 ・ {new Date(p.savedAt).toLocaleString('ja-JP', {month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                  <div className="pm-actions">
                    <button className="pm-btn" onClick={()=>loadPreset(name)}>読込</button>
                    <button className="pm-btn danger" onClick={()=>deletePreset(name)} aria-label={`${name} を削除`}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
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
