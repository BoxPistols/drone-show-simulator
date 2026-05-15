/**
 * normalizeShow — accept three import formats and produce a canonical
 * `EditableFormation[]` for the choreography editor.
 *
 *   (A) bare array        → legacy formations[]
 *   (B) v1 object         → { schema, formations, meta:{bpm}, audio }
 *   (C) named preset      → { savedAt, formations }
 *
 * Migrated from show-schema.js. Pure function — no DOM, no globals.
 */
import type { EditableFormation, EasingName, FormationId, PaletteKey } from '~/types/formations';
import { FORMATION_IDS } from '~/types/formations';

interface AudioMeta {
  name: string;
  duration: number | null;
}

export interface NormalizeResult {
  ok: boolean;
  formations?: EditableFormation[];
  bpm?: number | null;
  audio?: AudioMeta | null;
  fallbackCount?: number;
  warning?: string;
  error?: string;
}

interface RawFormation {
  id?: unknown;
  typeId?: unknown;
  jp?: unknown;
  en?: unknown;
  desc?: unknown;
  color?: unknown;
  dur?: unknown;
  drones?: unknown;
  altitude?: unknown;
  spread?: unknown;
  speed?: unknown;
  easing?: unknown;
  paletteOverride?: unknown;
  _uid?: unknown;
}

interface RawV1 {
  formations?: unknown;
  meta?: { bpm?: unknown };
  audio?: { name?: unknown; duration?: unknown };
}

const FALLBACK_TYPE: FormationId = 'sphere';

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isFormationId(v: string): v is FormationId {
  return (FORMATION_IDS as readonly string[]).includes(v);
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}

export function normalizeShow(data: unknown, knownIds?: readonly string[]): NormalizeResult {
  if (data == null) return { ok: false, error: 'null or undefined data' };
  const knownIdSet = new Set<string>(knownIds ?? FORMATION_IDS);

  let formationsArr: unknown[];
  let bpm: number | null = null;
  let audio: AudioMeta | null = null;

  if (Array.isArray(data)) {
    formationsArr = data;
  } else if (isObject(data) && Array.isArray((data as RawV1).formations)) {
    const obj = data as RawV1;
    formationsArr = obj.formations as unknown[];
    if (typeof obj.meta?.bpm === 'number') bpm = obj.meta.bpm;
    if (obj.audio && typeof obj.audio.name === 'string') {
      audio = {
        name: obj.audio.name,
        duration: typeof obj.audio.duration === 'number' ? obj.audio.duration : null,
      };
    }
  } else {
    return { ok: false, error: '認識できるフォーマットではありません' };
  }

  if (formationsArr.length === 0) {
    return { ok: false, error: '演目が空' };
  }

  let fallbackCount = 0;
  const formations: EditableFormation[] = formationsArr.map((raw, i) => {
    if (!raw || !isObject(raw) || typeof (raw as RawFormation).id !== 'string') {
      throw new Error(`演目 #${i + 1} に id がありません`);
    }
    const f = raw as RawFormation;
    const id = f.id as string;
    const rawType = typeof f.typeId === 'string' ? f.typeId : id;
    let typeId: FormationId;
    if (knownIdSet.size === 0) {
      typeId = isFormationId(rawType) ? rawType : (rawType as FormationId);
    } else if (knownIdSet.has(rawType) && isFormationId(rawType)) {
      typeId = rawType;
    } else if (knownIdSet.has(rawType)) {
      // knownIds includes rawType but it's not in our static type union
      // (unlikely; means caller passed custom ids). Keep as-is for back-compat.
      typeId = rawType as FormationId;
    } else {
      typeId = FALLBACK_TYPE;
      fallbackCount++;
    }

    return {
      id,
      typeId,
      _uid: typeof f._uid === 'string' ? f._uid : `imported-${i}-${id}`,
      easing: (typeof f.easing === 'string' ? f.easing : 'Ease-both') as EasingName,
      paletteOverride:
        typeof f.paletteOverride === 'string' ? (f.paletteOverride as PaletteKey) : null,
      altitude: num(f.altitude, 60),
      spread: num(f.spread, 55),
      speed: num(f.speed, 1.0),
      drones: num(f.drones, 660),
      dur: num(f.dur, 30),
      jp: str(f.jp, '新規'),
      en: str(f.en, 'New'),
      color: str(f.color, '#6ed3e6'),
      desc: str(f.desc, ''),
    };
  });

  if (bpm !== null) bpm = Math.max(30, Math.min(300, bpm));

  return { ok: true, formations, bpm, audio, fallbackCount };
}
