import type { PaletteKey, SkyKey } from '~/types/formations';

export const SPEED_STEPS = [0.25, 0.5, 1, 2, 5, 10] as const;
export type SpeedStep = (typeof SPEED_STEPS)[number];

export interface ShowPrefs {
  palette: PaletteKey;
  sky: SkyKey;
  trails: boolean;
  rotate: boolean;
  glow: boolean;
  /** 軽量モード。解像度の上限を 1 倍にし、残像を切り、星を減らす */
  lite: boolean;
  droneSize: number;
  speed: SpeedStep;
}

export type ToggleKey = 'trails' | 'rotate' | 'glow' | 'lite';

export const DEFAULT_PREFS: ShowPrefs = {
  palette: 'aurora',
  sky: 'night',
  trails: false,
  rotate: true,
  glow: true,
  lite: false,
  droneSize: 1.0,
  speed: 1,
};

export interface ShowState extends ShowPrefs {
  formationIndex: number;
  showTime: number;
  playing: boolean;
}

export interface HudInfo {
  time: number;
  alt: number;
  wind: number;
  frame: number;
  /** 直近の実測フレームレート。一時停止中は 0 */
  fps: number;
  /** 現在の描画解像度（devicePixelRatio 換算） */
  dpr: number;
}

export interface ShowControls {
  setPalette: (key: PaletteKey) => void;
  setSky: (key: SkyKey) => void;
  toggle: (key: ToggleKey) => void;
  setDroneSize: (n: number) => void;
  setSpeed: (n: SpeedStep) => void;
  cycleSpeed: (dir: 1 | -1) => void;
  togglePlay: () => void;
  seekToFormation: (i: number) => void;
}
