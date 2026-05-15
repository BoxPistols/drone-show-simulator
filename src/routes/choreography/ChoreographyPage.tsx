import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { FORMATIONS, FLEET } from '~/lib/formations';
import { normalizeShow } from '~/lib/showSchema';
import { useToast } from '~/hooks/useToast';
import { usePersistedState } from '~/hooks/usePersistedState';
import { FormationList } from './components/FormationList';
import { Inspector } from './components/Inspector';
import { Preview } from './components/Preview';
import { PresetModal, type Preset } from './components/PresetModal';
import { Timeline } from './components/Timeline';
import { WaveformBar } from './components/WaveformBar';
import { useAudio } from './hooks/useAudio';
import { useDirty } from './hooks/useDirty';
import {
  initialState,
  makeEditable,
  makeUid,
  reducer,
  startTimes,
  totalDuration,
  type ChoreoAction,
  type EditableFormation,
} from './store';
import type { FormationId } from '~/types/formations';
import './choreography.css';

const PRESETS_KEY = 'astra-flock-presets';

function fmt(s: number) {
  const sec = Math.max(0, Math.floor(s));
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

function isPresetMap(v: unknown): v is Record<string, Preset> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function ChoreographyPage() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const formations = state.formations;
  const starts = useMemo(() => startTimes(formations), [formations]);
  const totalDur = useMemo(() => totalDuration(formations), [formations]);

  const [selIdx, setSelIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [time, setTime] = useState(0);
  const [bpm, setBpm] = useState(120);
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const [presetPanelOpen, setPresetPanelOpen] = useState(false);

  const { show: showToast } = useToast();
  const audio = useAudio();
  const { isDirty, markClean } = useDirty(formations);

  // Animation tick
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTime((t) => (t + dt) % Math.max(1, totalDur));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, totalDur]);

  // Auto-follow playhead → selected index
  useEffect(() => {
    let idx = 0;
    for (let i = 0; i < starts.length; i++) {
      if (time >= starts[i]!) idx = i;
    }
    if (idx !== selIdx) setSelIdx(idx);
  }, [time, starts, selIdx]);

  const sel = formations[selIdx] ?? formations[0]!;
  const localTime = time - starts[selIdx]!;

  const seekTo = useCallback(
    (t: number) => {
      setTime(t);
      if (playing && audio.audio) audio.startAt(t);
    },
    [audio, playing]
  );

  // Audio play/stop sync
  useEffect(() => {
    if (!audio.audio) {
      audio.stop();
      return;
    }
    if (playing) audio.startAt(time);
    else audio.stop();
    return () => audio.stop();
    // intentional: time excluded so RAF doesn't restart audio every frame
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, audio.audio]);

  const prevTimeRef = useRef(0);
  useEffect(() => {
    if (playing && audio.audio && time < prevTimeRef.current - 1) {
      audio.startAt(time);
    }
    prevTimeRef.current = time;
  }, [time, playing, audio]);

  // Keyboard: undo / redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'undo' });
        showToast('↶ 元に戻しました');
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        dispatch({ type: 'redo' });
        showToast('↷ やり直しました');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showToast]);

  // CRUD callbacks
  const onAdd = useCallback(
    (typeId: FormationId) => {
      const template = FORMATIONS.find((f) => f.id === typeId);
      if (!template) return;
      const newF = makeEditable(template, makeUid('new'));
      dispatch({ type: 'insertAfter', index: selIdx, formation: newF });
      setSelIdx(selIdx + 1);
      seekTo(starts[selIdx]! + formations[selIdx]!.dur + 0.01);
      setAddPickerOpen(false);
      showToast(`${template.jp} を追加しました`);
    },
    [selIdx, formations, starts, seekTo, showToast]
  );
  const onDuplicate = useCallback(() => {
    const cur = formations[selIdx];
    if (!cur) return;
    dispatch({ type: 'duplicate', index: selIdx, uid: makeUid('dup') });
    setSelIdx(selIdx + 1);
    seekTo(starts[selIdx]! + cur.dur + 0.01);
    showToast(`${cur.jp} を複製しました`);
  }, [formations, selIdx, starts, seekTo, showToast]);
  const onDelete = useCallback(() => {
    if (formations.length <= 1) {
      showToast('最低 1 演目は必要です');
      return;
    }
    const removed = formations[selIdx]!;
    dispatch({ type: 'delete', index: selIdx });
    const newIdx = Math.max(0, Math.min(selIdx, formations.length - 2));
    setSelIdx(newIdx);
    showToast(`${removed.jp} を削除しました`);
  }, [formations, selIdx, showToast]);
  const onMove = useCallback(
    (i: number, dir: -1 | 1) => {
      dispatch({ type: 'move', index: i, dir });
      if (selIdx === i) setSelIdx(i + dir);
      else if (selIdx === i + dir) setSelIdx(i);
    },
    [selIdx]
  );
  const onPatch = useCallback(
    (patch: Partial<EditableFormation>) => {
      dispatch({ type: 'patch', index: selIdx, patch });
    },
    [selIdx]
  );

  // Save / load presets
  const [presets, setPresets] = usePersistedState<Record<string, Preset>>(
    PRESETS_KEY,
    {},
    isPresetMap
  );
  const onPresetSave = useCallback(
    (name: string) => {
      if (presets[name] && !window.confirm(`"${name}" は既に存在します。上書きしますか?`)) {
        return;
      }
      const next = { ...presets, [name]: { savedAt: Date.now(), formations } };
      setPresets(next);
      showToast(`プリセット保存: "${name}"`);
    },
    [presets, formations, setPresets, showToast]
  );
  const onPresetLoad = useCallback(
    (name: string) => {
      const p = presets[name];
      if (!p?.formations) return;
      const restored = p.formations.map((f, i) => ({
        ...f,
        _uid: `preset-${String(Date.now())}-${String(i)}`,
      }));
      dispatch({ type: 'replace', formations: restored });
      markClean(restored);
      setSelIdx(0);
      seekTo(0);
      setPresetPanelOpen(false);
      showToast(`読込: "${name}" (${restored.length} 演目)`);
    },
    [presets, markClean, seekTo, showToast]
  );
  const onPresetDelete = useCallback(
    (name: string) => {
      const next = { ...presets };
      delete next[name];
      setPresets(next);
      showToast(`削除: "${name}"`);
    },
    [presets, setPresets, showToast]
  );

  // Save / export / import
  const onSave = useCallback(() => {
    try {
      window.localStorage.setItem('astra-flock-programme', JSON.stringify(formations));
    } catch {
      /* quota / private mode — toast still fires so user knows */
    }
    markClean();
    showToast(`保存: ${formations.length} 演目を localStorage に記録`);
  }, [formations, markClean, showToast]);

  const onExport = useCallback(() => {
    const payload = {
      schema: 'astra-flock-show/1',
      exportedAt: new Date().toISOString(),
      meta: { bpm, fleet: { total: FLEET.total, available: FLEET.available } },
      audio: audio.audio ? { name: audio.audio.name, duration: audio.audio.duration } : null,
      formations,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.href = url;
    a.download = `astra-flock-show-${stamp}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    markClean();
    const audioTag = audio.audio ? ' + 音源 meta' : '';
    showToast(`書出完了: ${formations.length} 演目 + BPM${audioTag}`);
  }, [formations, bpm, audio.audio, markClean, showToast]);

  const onExportFlightPath = useCallback(() => {
    const drones: {
      id: string;
      idx: number;
      assigned: boolean;
      keyframes: { t: number; x: number; y: number; z: number; formation: string }[];
    }[] = [];
    for (let i = 0; i < FLEET.total; i++) {
      const keyframes: { t: number; x: number; y: number; z: number; formation: string }[] = [];
      let startT = 0;
      for (const f of formations) {
        const shape = FORMATIONS.find((s) => s.id === f.typeId);
        if (!shape?.targets) continue;
        keyframes.push({
          t: +startT.toFixed(2),
          x: +shape.targets[i * 3]!.toFixed(2),
          y: +shape.targets[i * 3 + 1]!.toFixed(2),
          z: +shape.targets[i * 3 + 2]!.toFixed(2),
          formation: f.typeId,
        });
        startT += f.dur;
      }
      drones.push({
        id: `AS-${String(i + 1).padStart(3, '0')}`,
        idx: i,
        assigned: i < (formations[0]?.drones ?? FLEET.total),
        keyframes,
      });
    }
    const payload = {
      schema: 'astra-flock-flightpath/1',
      exportedAt: new Date().toISOString(),
      totalDuration: +totalDur.toFixed(2),
      bpm,
      fleet: { total: FLEET.total, available: FLEET.available },
      audio: audio.audio ? { name: audio.audio.name, duration: audio.audio.duration } : null,
      drones,
    };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.href = url;
    a.download = `astra-flock-flightpath-${stamp}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    const sizeKB = Math.round(blob.size / 1024);
    showToast(`機体書出完了: ${drones.length} 機 × ${formations.length} KF ≈ ${sizeKB}KB`);
  }, [formations, totalDur, bpm, audio.audio, showToast]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const onFileChosen = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data: unknown = JSON.parse(reader.result as string);
          const res = normalizeShow(data);
          if (!res.ok || !res.formations) {
            showToast(`不正なファイル: ${res.error ?? 'unknown'}`);
            return;
          }
          const stamp = Date.now();
          const normalized = res.formations.map((f, i) => ({
            ...f,
            _uid: `imported-${String(stamp)}-${String(i)}`,
          }));
          dispatch({ type: 'replace', formations: normalized });
          markClean(normalized);
          setSelIdx(0);
          seekTo(0);
          setAddPickerOpen(false);
          if (typeof res.bpm === 'number') setBpm(res.bpm);
          const audioMetaMsg = res.audio?.name ? ` ・音源ヒント: ${res.audio.name}` : '';
          const warning =
            res.fallbackCount && res.fallbackCount > 0
              ? ` ・${res.fallbackCount} 件は未知形状を sphere にフォールバック`
              : '';
          const bpmMsg = typeof res.bpm === 'number' ? ` ・BPM=${res.bpm}` : '';
          showToast(`読込完了: ${normalized.length} 演目${bpmMsg}${audioMetaMsg}${warning}`);
        } catch (err) {
          showToast(`読込エラー: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
          e.target.value = '';
        }
      };
      reader.onerror = () => showToast('ファイル読込失敗');
      reader.readAsText(file);
    },
    [markClean, seekTo, showToast]
  );

  const audioInputRef = useRef<HTMLInputElement>(null);
  const onAudioChosen = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const meta = await audio.load(file);
        if (!meta) {
          showToast('音源読込: AudioContext を作成できません');
          return;
        }
        setPlaying(false);
        showToast(`音源読込: ${file.name} (${Math.round(meta.duration)}s)`);
      } catch (err) {
        showToast(`音源読込エラー: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        e.target.value = '';
      }
    },
    [audio, showToast]
  );

  const onSimulate = useCallback(() => {
    setPlaying(true);
    seekTo(0);
    showToast('シミュ実行: タイムラインを先頭から再生');
  }, [seekTo, showToast]);

  const handleAction = (action: ChoreoAction) => dispatch(action);
  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);

  return (
    <main className="ch-main" aria-label="振付エディタ">
      <header className="ch-head">
        <div>
          <h1 className="jp" style={{ margin: 0 }}>
            振付エディタ
          </h1>
          <div className="en">Choreography — Tonight&apos;s Programme</div>
        </div>
        <div className="ch-meta">
          <div>
            <div className="k">Formations</div>
            <div className="v">{formations.length}</div>
          </div>
          <div>
            <div className="k">Duration</div>
            <div className="v">{fmt(totalDur)}</div>
          </div>
          <div>
            <div className="k">Drones</div>
            <div className="v">660</div>
          </div>
          <div className="ch-actions">
            <button
              type="button"
              className="ch-btn ghost ch-icon"
              onClick={() => handleAction({ type: 'undo' })}
              disabled={state.past.length === 0}
              title={`元に戻す (${isMac ? '⌘' : 'Ctrl+'}Z)`}
              aria-label="元に戻す"
            >
              ↶
            </button>
            <button
              type="button"
              className="ch-btn ghost ch-icon"
              onClick={() => handleAction({ type: 'redo' })}
              disabled={state.future.length === 0}
              title={`やり直す (${isMac ? '⌘⇧' : 'Ctrl+Shift+'}Z)`}
              aria-label="やり直す"
            >
              ↷
            </button>
            <button type="button" className="ch-btn ghost" onClick={() => setPresetPanelOpen(true)}>
              プリセット
            </button>
            <button
              type="button"
              className="ch-btn ghost"
              onClick={() => fileInputRef.current?.click()}
            >
              読込 .json
            </button>
            <button
              type="button"
              className="ch-btn ghost"
              onClick={onExport}
              title="演目 + BPM + 音源 meta"
            >
              書出 .json
            </button>
            <button
              type="button"
              className="ch-btn ghost"
              onClick={onExportFlightPath}
              title="機体別フライトパス (実機連携用)"
            >
              機体書出
            </button>
            <button type="button" className="ch-btn" onClick={onSimulate}>
              シミュ実行
            </button>
            <button
              type="button"
              className="ch-btn primary"
              onClick={onSave}
              title={isDirty ? '未保存の変更あり' : '保存済'}
            >
              {isDirty && (
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#fff',
                    marginRight: 6,
                    verticalAlign: 'middle',
                  }}
                />
              )}
              保存{isDirty && '*'}
            </button>
            <input
              type="file"
              accept="application/json,.json"
              ref={fileInputRef}
              onChange={onFileChosen}
              style={{ display: 'none' }}
              aria-hidden="true"
            />
          </div>
        </div>
      </header>

      <div className="ch-body">
        <FormationList
          formations={formations}
          selectedIndex={selIdx}
          addPickerOpen={addPickerOpen}
          onSelect={(i) => {
            setSelIdx(i);
            seekTo(starts[i]! + 0.01);
          }}
          onMove={onMove}
          onAdd={onAdd}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onToggleAddPicker={() => setAddPickerOpen((v) => !v)}
        />

        <div className="ch-center">
          <div className="ch-preview">
            <Preview formation={sel} time={localTime} total={sel.dur} />
            <div className="ch-preview-ui">
              <div className="cp-label">
                {sel.jp}
                <span className="en">{sel.en}</span>
              </div>
              <div className="cp-counter">
                {String(selIdx + 1).padStart(2, '0')} / {String(formations.length).padStart(2, '0')}{' '}
                ・ {fmt(localTime)} / {fmt(sel.dur)}
              </div>
            </div>
          </div>

          <div className="ch-timeline">
            <div className="tl-head">
              <div className="tl-title">
                プログラム・タイムライン<span className="en">Programme Timeline</span>
              </div>
              <div className="tl-time">
                {fmt(time)} / {fmt(totalDur)}
              </div>
            </div>
            <Timeline
              formations={formations}
              starts={starts}
              totalDur={totalDur}
              selectedIndex={selIdx}
              time={time}
              bpm={bpm}
              onSelect={setSelIdx}
              onSeek={seekTo}
              onSetDur={(i, dur) => dispatch({ type: 'setDur', index: i, dur })}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 4,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--mincho)',
                  fontSize: 10,
                  color: 'var(--text-3)',
                  letterSpacing: '0.08em',
                }}
              >
                {audio.audio ? (
                  <>
                    音源 ・ {audio.audio.name}{' '}
                    <span
                      style={{
                        color: 'var(--text-3)',
                        fontSize: 9,
                        marginLeft: 6,
                        fontFamily: 'var(--mono)',
                      }}
                    >
                      {fmt(audio.audio.duration)}
                    </span>
                  </>
                ) : (
                  <>
                    音楽トラック ・ Music{' '}
                    <span style={{ color: 'var(--text-3)', fontSize: 9, marginLeft: 6 }}>
                      (click でシーク)
                    </span>
                  </>
                )}
              </div>
              <div className="music-btn-row">
                <button
                  type="button"
                  className="music-btn"
                  onClick={() => audioInputRef.current?.click()}
                >
                  {audio.audio ? '差替' : '+ 音源'}
                </button>
                {audio.audio && (
                  <button type="button" className="music-btn danger" onClick={audio.clear}>
                    解除
                  </button>
                )}
                <input
                  type="file"
                  accept="audio/*"
                  ref={audioInputRef}
                  onChange={(e) => void onAudioChosen(e)}
                  style={{ display: 'none' }}
                  aria-hidden="true"
                />
              </div>
            </div>
            <WaveformBar audio={audio.audio} time={time} totalDur={totalDur} onSeek={seekTo} />
            <div className="tl-transport">
              <button
                type="button"
                className="tl-tbtn"
                onClick={() => {
                  const i = Math.max(0, selIdx - 1);
                  setSelIdx(i);
                  seekTo(starts[i]! + 0.01);
                }}
                aria-label="前の演目"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  aria-hidden="true"
                >
                  <path d="M12 3 L5 8 L12 13 Z M4 3 L4 13" />
                </svg>
              </button>
              <button
                type="button"
                className="tl-tbtn play"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? '一時停止' : '再生'}
                aria-pressed={playing}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  {playing ? (
                    <path d="M4 3 L7 3 L7 13 L4 13 Z M9 3 L12 3 L12 13 L9 13 Z" />
                  ) : (
                    <path d="M4 3 L13 8 L4 13 Z" />
                  )}
                </svg>
              </button>
              <button
                type="button"
                className="tl-tbtn"
                onClick={() => {
                  const i = Math.min(formations.length - 1, selIdx + 1);
                  setSelIdx(i);
                  seekTo(starts[i]! + 0.01);
                }}
                aria-label="次の演目"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  aria-hidden="true"
                >
                  <path d="M4 3 L11 8 L4 13 Z M12 3 L12 13" />
                </svg>
              </button>
              <div style={{ flex: 1 }} />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  color: 'var(--text-3)',
                  letterSpacing: '0.1em',
                }}
              >
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number"
                    min={30}
                    max={300}
                    step={1}
                    value={bpm}
                    onChange={(e) =>
                      setBpm(
                        Math.max(30, Math.min(300, Number.parseInt(e.target.value, 10) || 120))
                      )
                    }
                    onWheel={(e) => e.currentTarget.blur()}
                    style={{
                      width: 48,
                      padding: '3px 6px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--hair)',
                      borderRadius: 4,
                      color: 'var(--text-0)',
                      fontSize: 11,
                      fontFamily: 'var(--mono)',
                      textAlign: 'right',
                    }}
                    aria-label="BPM"
                  />
                  <span>BPM</span>
                </label>
                <span>・ 東京湾 ・ 2026-04-28 19:00 JST</span>
              </div>
            </div>
          </div>
        </div>

        <Inspector
          formation={sel}
          index={selIdx}
          time={time}
          totalTime={totalDur}
          onPatch={onPatch}
        />
      </div>

      <PresetModal
        open={presetPanelOpen}
        presets={presets}
        onClose={() => setPresetPanelOpen(false)}
        onSave={onPresetSave}
        onLoad={onPresetLoad}
        onDelete={onPresetDelete}
      />
    </main>
  );
}
