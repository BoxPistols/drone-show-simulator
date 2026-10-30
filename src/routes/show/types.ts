import type { PaletteKey, SkyKey } from '~/types/formations';

export const SPEED_STEPS = [0.25, 0.5, 1, 2, 5, 10] as const;
export type SpeedStep = (typeof SPEED_STEPS)[number];

/** 視点。観客席からの orbit、機体のカメラ、自動で一周するフライアラウンド */
export const CAMERA_MODES = ['orbit', 'drone', 'fly'] as const;
export type CameraMode = (typeof CAMERA_MODES)[number];

export interface ShowPrefs {
  palette: PaletteKey;
  sky: SkyKey;
  trails: boolean;
  rotate: boolean;
  glow: boolean;
  /** 軽量モード。解像度の上限を 1 倍にし、残像を切り、星を減らす */
  lite: boolean;
  /** アンビエント音楽（Web Audio で生成。音源ファイルは持たない） */
  music: boolean;
  /** 音量 0..1 */
  volume: number;
  camera: CameraMode;
  droneSize: number;
  speed: SpeedStep;
}

export type ToggleKey = 'trails' | 'rotate' | 'glow' | 'lite' | 'music';

export const DEFAULT_PREFS: ShowPrefs = {
  palette: 'aurora',
  sky: 'night',
  trails: false,
  rotate: true,
  glow: true,
  lite: false,
  music: false,
  volume: 0.6,
  camera: 'orbit',
  droneSize: 1.0,
  speed: 1,
};

export interface ShowState extends ShowPrefs {
  formationIndex: number;
  showTime: number;
  playing: boolean;
  /** 機体目線で乗る機体。-1 なら未選択 */
  povIndex: number;
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
