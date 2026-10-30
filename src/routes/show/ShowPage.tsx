import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FORMATIONS, TOTAL_TIME } from '~/lib/formations';
import { usePersistedState } from '~/hooks/usePersistedState';
import { useToast } from '~/hooks/useToast';
import type { PaletteKey, SkyKey } from '~/types/formations';
import { ChromeTop } from './components/ChromeTop';
import { KeyboardHints } from './components/KeyboardHints';
import { NowPlayingCard } from './components/NowPlayingCard';
import { ProgrammeBar } from './components/ProgrammeBar';
import { TransportBar } from './components/TransportBar';
import { TweaksPanel } from './components/TweaksPanel';
import { type ShowHandle, useDroneShow } from './hooks/useDroneShow';
import { isPrefs, prefsReducer, withDefaults } from './prefs';
import {
  DEFAULT_PREFS,
  type HudInfo,
  type ShowPrefs,
  type ShowState,
  SPEED_STEPS,
  type SpeedStep,
  type ToggleKey,
} from './types';
import { fmtTime, nearestSpeed } from './utils';
import './show.css';

const INITIAL_HUD: HudInfo = { time: 0, alt: 0, wind: 0, frame: 0, fps: 0, dpr: 1 };

export function ShowPage() {
  const canvasRootRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const { show: showToast } = useToast();

  // Prefs: localStorage + URL params (URL > localStorage > default)
  const [persistedPrefs, setPersistedPrefs] = usePersistedState<ShowPrefs>(
    'astra-flock-prefs',
    DEFAULT_PREFS,
    isPrefs
  );

  const initial = useMemo<ShowPrefs>(() => {
    const sp = parseFloat(searchParams.get('speed') ?? '');
    const speedFromUrl: SpeedStep | null = Number.isFinite(sp) && sp > 0 ? nearestSpeed(sp) : null;
    return {
      ...withDefaults(persistedPrefs),
      ...(speedFromUrl !== null ? { speed: speedFromUrl } : {}),
    };
    // intentionally only seed once; subsequent edits flow through dispatch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [prefs, dispatch] = useReducer(prefsReducer, initial);

  useEffect(() => {
    setPersistedPrefs(prefs);
  }, [prefs, setPersistedPrefs]);

  // 描画が間に合わないときの自動軽量モード。今回の表示だけの状態で、保存はしない
  // （一時的に重かっただけで、次回以降もずっと画質を落としたままにしないため）
  const [autoLite, setAutoLite] = useState(false);
  const effectiveLite = prefs.lite || autoLite;
  const effectiveLiteRef = useRef(effectiveLite);
  effectiveLiteRef.current = effectiveLite;
  const effectivePrefs = useMemo(() => ({ ...prefs, lite: effectiveLite }), [prefs, effectiveLite]);

  const initialFormationIndex = useMemo(() => {
    const f = parseInt(searchParams.get('f') ?? '', 10);
    return Number.isInteger(f) && f >= 0 && f < FORMATIONS.length ? f : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Three.js のループが毎フレーム読む生の状態 ----
  const stateRef = useRef<ShowState>({
    ...initial,
    formationIndex: initialFormationIndex,
    showTime: FORMATIONS[initialFormationIndex]!.start + 0.01,
    playing: true,
  });
  useEffect(() => {
    stateRef.current = { ...stateRef.current, ...effectivePrefs };
  }, [effectivePrefs]);

  // ---- ループから戻ってくる表示用の状態 ----
  const [formationIndex, setFormationIndex] = useState(initialFormationIndex);
  const [playing, setPlaying] = useState(true);
  const [hud, setHud] = useState<HudInfo>(INITIAL_HUD);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  useEffect(() => {
    stateRef.current.playing = playing;
  }, [playing]);

  const handleRef = useRef<ShowHandle | null>(null);
  const onAutoLite = useCallback(() => {
    setAutoLite(true);
    showToast('描画が重いため、今回の表示だけ軽量モードに切り替えました（設定パネルで戻せます）');
  }, [showToast]);
  const onUnavailable = useCallback(() => setWebglUnavailable(true), []);

  useDroneShow(canvasRootRef.current, {
    stateRef,
    onFormationChange: setFormationIndex,
    onHudTick: setHud,
    onAutoLite,
    onUnavailable,
    handleRef,
  });
  // ref は初回レンダー時点では空なので、マウント後にもう一度だけ描画してフックへ渡す
  const [, forceRerender] = useState(0);
  useEffect(() => {
    if (canvasRootRef.current) forceRerender((n) => n + 1);
  }, []);

  // ---- 視覚効果を減らす設定の人には自動回転を切る ----
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      prefs.rotate
    ) {
      dispatch({ type: 'toggle', key: 'rotate' });
    }
    // intentional: only check once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- 操作 ----
  const seekToFormation = useCallback((i: number) => {
    const target = FORMATIONS[i];
    if (!target) return;
    stateRef.current.formationIndex = i;
    stateRef.current.showTime = target.start + 0.01;
    setFormationIndex(i);
  }, []);
  const onPrev = useCallback(
    () => seekToFormation(Math.max(0, stateRef.current.formationIndex - 1)),
    [seekToFormation]
  );
  const onNext = useCallback(
    () => seekToFormation(Math.min(FORMATIONS.length - 1, stateRef.current.formationIndex + 1)),
    [seekToFormation]
  );

  const togglePlay = useCallback(() => setPlaying((p) => !p), []);

  const cycleSpeed = useCallback((dir: 1 | -1) => {
    const idx = SPEED_STEPS.indexOf(stateRef.current.speed);
    const nextIdx = (idx + dir + SPEED_STEPS.length) % SPEED_STEPS.length;
    dispatch({ type: 'speed', value: SPEED_STEPS[nextIdx]! });
  }, []);

  const onFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.().catch(() => {
        /* user gesture required or unsupported */
      });
    } else {
      void document.exitFullscreen?.();
    }
  }, []);

  const onScreenshot = useCallback(() => {
    const url = handleRef.current?.capture();
    if (!url) {
      showToast('この環境ではスクリーンショットを保存できません');
      return;
    }
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const a = document.createElement('a');
    a.href = url;
    a.download = `astra-flock-${stamp}.png`;
    a.click();
  }, [showToast]);

  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [hintsOpen, setHintsOpen] = useState(false);
  const closeTweaks = useCallback(() => setTweaksOpen(false), []);
  const toggleTweaks = useCallback(() => setTweaksOpen((v) => !v), []);
  const closeHints = useCallback(() => setHintsOpen(false), []);

  const onPaletteChange = useCallback(
    (value: PaletteKey) => dispatch({ type: 'palette', value }),
    []
  );
  const onSkyChange = useCallback((value: SkyKey) => dispatch({ type: 'sky', value }), []);
  const onToggle = useCallback((key: ToggleKey) => {
    if (key !== 'lite') {
      dispatch({ type: 'toggle', key });
      return;
    }
    // 軽量モードの切替は「自動」と「保存される設定」をまとめて扱う
    if (effectiveLiteRef.current) {
      setAutoLite(false);
      dispatch({ type: 'set', key: 'lite', value: false });
    } else {
      dispatch({ type: 'set', key: 'lite', value: true });
    }
  }, []);
  const onSizeChange = useCallback((value: number) => dispatch({ type: 'droneSize', value }), []);

  // ---- キーボード ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onPrev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          onNext();
          break;
        case 'f':
        case 'F':
          onFullscreen();
          break;
        case 's':
        case 'S':
          onScreenshot();
          break;
        case '?':
        case '/':
          setHintsOpen((v) => !v);
          break;
        case 'Escape':
          setHintsOpen(false);
          setTweaksOpen(false);
          if (document.fullscreenElement) void document.exitFullscreen?.();
          break;
        case 't':
        case 'T':
          toggleTweaks();
          break;
        case '+':
        case '=':
          cycleSpeed(1);
          break;
        case '-':
        case '_':
          cycleSpeed(-1);
          break;
        default: {
          const n = parseInt(e.key, 10);
          if (n >= 1 && n <= FORMATIONS.length) seekToFormation(n - 1);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    togglePlay,
    seekToFormation,
    cycleSpeed,
    onFullscreen,
    onScreenshot,
    onPrev,
    onNext,
    toggleTweaks,
  ]);

  useEffect(() => {
    document.body.classList.toggle('tweaks-open', tweaksOpen);
    return () => document.body.classList.remove('tweaks-open');
  }, [tweaksOpen]);

  const currentFormation = FORMATIONS[formationIndex] ?? FORMATIONS[0]!;
  const stats = useMemo(
    () => [
      { label: 'Drones', value: '660', unit: '/660' },
      { label: 'Altitude', value: hud.alt.toFixed(0), unit: 'm' },
      { label: 'Wind', value: hud.wind.toFixed(1), unit: 'm/s' },
      { label: 'Viewers', value: '24.6', unit: 'K' },
    ],
    [hud.alt, hud.wind]
  );

  return (
    <>
      <div id="stars-bg" aria-hidden="true" />
      <div id="canvas-root" ref={canvasRootRef} />
      <div className="corner-tick tl" aria-hidden="true" />
      <div className="corner-tick tr" aria-hidden="true" />
      <div className="corner-tick bl" aria-hidden="true" />
      <div className="corner-tick br" aria-hidden="true" />
      <div className="location" aria-hidden="true">
        TOKYO BAY ・ 35.6762°N 139.7690°E
      </div>

      {webglUnavailable && (
        <div className="webgl-notice" role="status">
          <strong>3D 表示を利用できません</strong>
          このブラウザでは WebGL が無効か、対応していません。演目の情報と操作はそのまま使えます。
        </div>
      )}

      <ChromeTop stats={stats} />
      <NowPlayingCard
        formation={currentFormation}
        index={formationIndex}
        total={FORMATIONS.length}
      />
      <TransportBar
        playing={playing}
        speed={prefs.speed}
        tweaksOpen={tweaksOpen}
        onPlayToggle={togglePlay}
        onPrev={onPrev}
        onNext={onNext}
        onSpeedCycle={cycleSpeed}
        onFullscreen={onFullscreen}
        onScreenshot={onScreenshot}
        onTweaks={toggleTweaks}
      />
      <ProgrammeBar
        formations={FORMATIONS}
        currentIndex={formationIndex}
        currentTime={hud.time}
        totalTime={TOTAL_TIME}
        onSeek={seekToFormation}
      />
      <TweaksPanel
        open={tweaksOpen}
        prefs={effectivePrefs}
        formationIndex={formationIndex}
        onClose={closeTweaks}
        onPaletteChange={onPaletteChange}
        onSkyChange={onSkyChange}
        onToggle={onToggle}
        onSizeChange={onSizeChange}
        onSeekFormation={seekToFormation}
      />
      <KeyboardHints open={hintsOpen} onClose={closeHints} />
      <div className="frame-count" aria-hidden="true">
        FRAME {String(hud.frame).padStart(6, '0')} ・{' '}
        {hud.fps > 0 ? `${String(hud.fps)} FPS` : 'PAUSED'} ・ {hud.dpr.toFixed(2)}× ・{' '}
        {fmtTime(hud.time)}
      </div>
    </>
  );
}
