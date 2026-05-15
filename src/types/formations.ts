export const FORMATION_IDS = [
  'sphere',
  'helix',
  'torus',
  'wave',
  'bear',
  'dna',
  'cube',
  'heart',
  'galaxy',
] as const;

export type FormationId = (typeof FORMATION_IDS)[number];

export const EASING_NAMES = ['Linear', 'Ease-in', 'Ease-out', 'Ease-both', 'Elastic'] as const;
export type EasingName = (typeof EASING_NAMES)[number];

export const PALETTE_KEYS = ['aurora', 'sakura', 'ember', 'mono', 'flock'] as const;
export type PaletteKey = (typeof PALETTE_KEYS)[number];

export const SKY_KEYS = ['night', 'twilight', 'dawn'] as const;
export type SkyKey = (typeof SKY_KEYS)[number];

export interface Palette {
  readonly name: string;
  readonly jp: string;
  readonly colors: readonly [string, string, string, string];
}

export interface Sky {
  readonly name: string;
  readonly jp: string;
  readonly bg: readonly [string, string, string];
}

export interface FleetSnapshot {
  readonly total: number;
  readonly active: number;
  readonly charging: number;
  readonly standby: number;
  readonly maint: number;
  readonly available: number;
  readonly nonFlyable: number;
  readonly reservable: number;
}

export interface BaseFormation {
  readonly id: FormationId;
  readonly jp: string;
  readonly en: string;
  readonly desc: string;
  readonly dur: number;
  readonly color: string;
}

export interface ComputedFormation extends BaseFormation {
  readonly targets: Float32Array;
  readonly start: number;
}

/**
 * Per-instance editable formation in the choreography editor.
 * `id` may collide after duplication — `_uid` is the React key,
 * `typeId` references the underlying shape function in `FORMATIONS`.
 */
export interface EditableFormation {
  id: string;
  typeId: FormationId;
  _uid: string;
  jp: string;
  en: string;
  desc: string;
  dur: number;
  color: string;
  drones: number;
  altitude: number;
  spread: number;
  speed: number;
  easing: EasingName;
  paletteOverride: PaletteKey | null;
}
