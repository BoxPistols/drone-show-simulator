import type { PaletteKey, SkyKey } from '~/types/formations';
import { PALETTE_KEYS, SKY_KEYS } from '~/types/formations';
import { DEFAULT_PREFS, type ShowPrefs, type SpeedStep, type ToggleKey } from './types';
import { isSpeedStep } from './utils';

export type PrefAction =
  | { type: 'palette'; value: PaletteKey }
  | { type: 'sky'; value: SkyKey }
  | { type: 'toggle'; key: ToggleKey }
  | { type: 'set'; key: ToggleKey; value: boolean }
  | { type: 'droneSize'; value: number }
  | { type: 'speed'; value: SpeedStep };

export function prefsReducer(state: ShowPrefs, action: PrefAction): ShowPrefs {
  switch (action.type) {
    case 'palette':
      return { ...state, palette: action.value };
    case 'sky':
      return { ...state, sky: action.value };
    case 'toggle':
      return { ...state, [action.key]: !state[action.key] };
    case 'set':
      return state[action.key] === action.value ? state : { ...state, [action.key]: action.value };
    case 'droneSize':
      return { ...state, droneSize: Math.max(0.5, Math.min(2.5, action.value)) };
    case 'speed':
      return { ...state, speed: action.value };
  }
}

/** 保存済み設定の検証。あとから増えた項目（lite）は無くても通し、既定値で補う */
export function isPrefs(v: unknown): v is ShowPrefs {
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
    (p.lite === undefined || typeof p.lite === 'boolean') &&
    typeof p.droneSize === 'number' &&
    typeof p.speed === 'number' &&
    isSpeedStep(p.speed)
  );
}

/** 保存値に既定値を重ね、足りない項目を補う */
export function withDefaults(p: Partial<ShowPrefs>): ShowPrefs {
  return { ...DEFAULT_PREFS, ...p };
}
