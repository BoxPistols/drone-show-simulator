import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FORMATIONS, TOTAL_TIME } from '~/lib/formations';
import { usePersistedState } from '~/hooks/usePersistedState';
import type { PaletteKey, SkyKey } from '~/types/formations';
import { PALETTE_KEYS, SKY_KEYS } from '~/types/formations';
import { ChromeTop } from './components/ChromeTop';
import { KeyboardHints } from './components/KeyboardHints';
import { NowPlayingCard } from './components/NowPlayingCard';
import { ProgrammeBar } from './components/ProgrammeBar';
import { TransportBar } from './components/TransportBar';
import { TweaksPanel } from './components/TweaksPanel';
import { useDroneShow } from './hooks/useDroneShow';
import {
  DEFAULT_PREFS,
  type ShowPrefs,
  type ShowState,
  SPEED_STEPS,
  type SpeedStep,
} from './types';
import { fmtTime, isSpeedStep, nearestSpeed } from './utils';
import './show.css';

type PrefAction =
  | { type: 'palette'; value: PaletteKey }
  | { type: 'sky'; value: SkyKey }
  | { type: 'toggle'; key: 'trails' | 'rotate' | 'glow' }
  | { type: 'droneSize'; value: number }
  | { type: 'speed'; value: SpeedStep };

function prefsReducer(state: ShowPrefs, action: PrefAction): ShowPrefs {
  switch (action.type) {
    case 'palette':
      return { ...state, palette: action.value };
    case 'sky':
      return { ...state, sky: action.value };
    case 'toggle':
      return { ...state, [action.key]: !state[action.key] };
    case 'droneSize':
      return { ...state, droneSize: Math.max(0.5, Math.min(2.5, action.value)) };
    case 'speed':
      return { ...state, speed: action.value };
  }
}

function isPrefs(v: unknown): v is ShowPrefs {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Partial<ShowPrefs>;
  return (
    typeof p.palette === 'string' &&
    (PALETTE_KEYS as readonly string[]).includes(p.palette) &&
    typeof p.sky === 'string' &&
    (SKY_KEYS as readonly string[]).includes(p.sky) &&
    typeof p.trails === 'boolean' &&
    typeof p.rotate === 'boolean' &&
    typeof p.glow === 'boolean' &&
    typeof p.droneSize === 'number' &&
    typeof p.speed === 'number' &&
    isSpeedStep(p.speed)
  );
}

export function ShowPage() {
  const canvasRootRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();

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
      ...persistedPrefs,
      ...(speedFromUrl !== null ? { speed: speedFromUrl } : {}),
    };
    // intentionally only seed once; subsequent edits flow through dispatch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [prefs, dispatch] = useReducer(prefsReducer, initial);

  // Persist whenever prefs change
  useEffect(() => {
    setPersistedPrefs(prefs);
  }, [prefs, setPersistedPrefs]);

  // Initial formation index from URL ?f=<n>
  const initialFormationIndex = useMemo(() => {
    const f = parseInt(searchParams.get('f') ?? '', 10);
    return Number.isInteger(f) && f >= 0 && f < FORMATIONS.length ? f : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Live, mutable show state read by the Three.js loop every frame ----
  const stateRef = useRef<ShowState>({
    ...initial,
    formationIndex: initialFormationIndex,
    showTime: FORMATIONS[initialFormationIndex]!.start + 0.01,
    playing: true,
  });

  // Sync prefs into the live ref so the loop sees them
  useEffect(() => {
    stateRef.current = { ...stateRef.current, ...prefs };
  }, [prefs]);

  // ---- Reactive UI state mirrored from the loop via callbacks ----
  const [formationIndex, setFormationIndex] = useState(initialFormationIndex);
  const [playing, setPlaying] = useState(true);
  const [hud, setHud] = useState({ time: 0, alt: 0, wind: 0, frame: 0 });

  // Keep stateRef.playing in sync when user toggles
  useEffect(() => {
    stateRef.current.playing = playing;
  }, [playing]);

  // ---- Mount the Three.js scene ----
  // Render canvas-root once on mount; pass static callbacks via stateRef
  useDroneShow(canvasRootRef.current, {
    stateRef,
    onFormationChange: setFormationIndex,
    onHudTick: setHud,
  });
  // The ref isn't populated on first render, so re-mount the hook after first paint
  const [, forceRerender] = useState(0);
  useEffect(() => {
    if (canvasRootRef.current) forceRerender((n) => n + 1);
  }, []);

  // ---- Reduced motion: disable auto-rotate by default ----
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

  // ---- Controls ----
  const seekToFormation = useCallback((i: number) => {
    const target = FORMATIONS[i];
    if (!target) return;
    stateRef.current.formationIndex = i;
    stateRef.current.showTime = target.start + 0.01;
    setFormationIndex(i);
  }, []);

  const togglePlay = useCallback(() => setPlaying((p) => !p), []);

  const cycleSpeed = useCallback(
    (dir: 1 | -1) => {
      const idx = SPEED_STEPS.indexOf(prefs.speed);
      const nextIdx = (idx + dir + SPEED_STEPS.length) % SPEED_STEPS.length;
      dispatch({ type: 'speed', value: SPEED_STEPS[nextIdx]! });
    },
    [prefs.speed]
  );

  const onFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.().catch(() => {
        /* user gesture required or unsupported */
      });
    } else {
      void document.exitFullscreen?.();
    }
  }, []);

  const [screenshotTrigger, setScreenshotTrigger] = useState(0);
  const onScreenshot = useCallback(() => setScreenshotTrigger((n) => n + 1), []);
  useEffect(() => {
    if (screenshotTrigger === 0) return;
    const canvas = canvasRootRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const a = document.createElement('a');
    a.href = url;
    a.download = `astra-flock-${stamp}.png`;
    a.click();
  }, [screenshotTrigger]);

  // ---- Tweaks panel + keyboard hints visibility ----
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [hintsOpen, setHintsOpen] = useState(false);

  // ---- Keyboard shortcuts ----
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
          seekToFormation(Math.max(0, formationIndex - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekToFormation(Math.min(FORMATIONS.length - 1, formationIndex + 1));
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
          setTweaksOpen((v) => !v);
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
  }, [formationIndex, togglePlay, seekToFormation, cycleSpeed, onFullscreen, onScreenshot]);

  // ---- HUD body class for tweaks-open ----
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
      <div id="stars-bg" />
      <div id="canvas-root" ref={canvasRootRef} />
      <div className="corner-tick tl" aria-hidden="true" />
      <div className="corner-tick tr" aria-hidden="true" />
      <div className="corner-tick bl" aria-hidden="true" />
      <div className="corner-tick br" aria-hidden="true" />
      <div className="location" aria-hidden="true">
        TOKYO BAY ・ 35.6762°N 139.7690°E
      </div>

      <ChromeTop stats={stats} />
      <NowPlayingCard
        formation={currentFormation}
        index={formationIndex}
        total={FORMATIONS.length}
      />
      <TransportBar
        playing={playing}
        speed={prefs.speed}
        onPlayToggle={togglePlay}
        onPrev={() => seekToFormation(Math.max(0, formationIndex - 1))}
        onNext={() => seekToFormation(Math.min(FORMATIONS.length - 1, formationIndex + 1))}
        onSpeedCycle={cycleSpeed}
        onFullscreen={onFullscreen}
        onScreenshot={onScreenshot}
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
        state={{ ...prefs, formationIndex, showTime: hud.time, playing }}
        onClose={() => setTweaksOpen(false)}
        onPaletteChange={(value) => dispatch({ type: 'palette', value })}
        onSkyChange={(value) => dispatch({ type: 'sky', value })}
        onToggle={(key) => dispatch({ type: 'toggle', key })}
        onSizeChange={(value) => dispatch({ type: 'droneSize', value })}
        onSeekFormation={seekToFormation}
      />
      <KeyboardHints open={hintsOpen} onClose={() => setHintsOpen(false)} />
      <div className="frame-count" aria-hidden="true">
        FRAME {String(hud.frame).padStart(6, '0')} ・ 60 FPS ・ REC ・ {fmtTime(hud.time)}
      </div>
    </>
  );
}
