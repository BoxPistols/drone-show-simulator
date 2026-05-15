import type { PaletteKey, SkyKey } from '~/types/formations';

export const SPEED_STEPS = [0.25, 0.5, 1, 2, 5, 10] as const;
export type SpeedStep = (typeof SPEED_STEPS)[number];

export interface ShowPrefs {
  palette: PaletteKey;
  sky: SkyKey;
  trails: boolean;
  rotate: boolean;
  glow: boolean;
  droneSize: number;
  speed: SpeedStep;
}

export const DEFAULT_PREFS: ShowPrefs = {
  palette: 'aurora',
  sky: 'night',
  trails: false,
  rotate: true,
  glow: true,
  droneSize: 1.0,
  speed: 1,
};

export interface ShowState extends ShowPrefs {
  formationIndex: number;
  showTime: number;
  playing: boolean;
}

export interface ShowControls {
  setPalette: (key: PaletteKey) => void;
  setSky: (key: SkyKey) => void;
  toggle: (key: 'trails' | 'rotate' | 'glow') => void;
  setDroneSize: (n: number) => void;
  setSpeed: (n: SpeedStep) => void;
  cycleSpeed: (dir: 1 | -1) => void;
  togglePlay: () => void;
  seekToFormation: (i: number) => void;
}
