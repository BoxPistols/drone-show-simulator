import type { EditableFormation, EasingName, FormationId, PaletteKey } from '~/types/formations';
import { FORMATIONS } from '~/lib/formations';

export const HISTORY_LIMIT = 50;

/**
 * Build a fresh EditableFormation from a base shape definition.
 * Used for the initial programme + the "+ formation" picker.
 */
export function makeEditable(
  base: { id: FormationId; jp: string; en: string; desc: string; dur: number; color: string },
  uid: string
): EditableFormation {
  return {
    id: base.id,
    typeId: base.id,
    _uid: uid,
    jp: base.jp,
    en: base.en,
    desc: base.desc,
    dur: base.dur,
    color: base.color,
    drones: 660,
    altitude: 60,
    spread: 55,
    speed: 1.0,
    easing: 'Ease-both',
    paletteOverride: null,
  };
}

export function makeUid(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rand}`;
}

export function initialFormations(): EditableFormation[] {
  return FORMATIONS.map((f, i) => makeEditable(f, `init-${String(i)}-${f.id}`));
}

export interface ChoreographyState {
  formations: EditableFormation[];
  past: EditableFormation[][];
  future: EditableFormation[][];
}

export function initialState(): ChoreographyState {
  return { formations: initialFormations(), past: [], future: [] };
}

export type ChoreoAction =
  | { type: 'replace'; formations: EditableFormation[] }
  | { type: 'patch'; index: number; patch: Partial<EditableFormation> }
  | { type: 'move'; index: number; dir: -1 | 1 }
  | { type: 'insertAfter'; index: number; formation: EditableFormation }
  | { type: 'duplicate'; index: number; uid: string }
  | { type: 'delete'; index: number }
  | { type: 'setDur'; index: number; dur: number }
  | { type: 'undo' }
  | { type: 'redo' };

const HISTORYLESS = new Set<ChoreoAction['type']>(['patch', 'setDur', 'undo', 'redo']);

function pushHistory(state: ChoreographyState): Pick<ChoreographyState, 'past' | 'future'> {
  return {
    past: [...state.past, state.formations].slice(-HISTORY_LIMIT),
    future: [],
  };
}

export function reducer(state: ChoreographyState, action: ChoreoAction): ChoreographyState {
  switch (action.type) {
    case 'replace': {
      return {
        formations: action.formations,
        past: [...state.past, state.formations].slice(-HISTORY_LIMIT),
        future: [],
      };
    }
    case 'patch': {
      return {
        ...state,
        formations: state.formations.map((f, i) =>
          i === action.index ? { ...f, ...action.patch } : f
        ),
      };
    }
    case 'setDur': {
      return {
        ...state,
        formations: state.formations.map((f, i) =>
          i === action.index ? { ...f, dur: Math.max(5, action.dur) } : f
        ),
      };
    }
    case 'move': {
      const to = action.index + action.dir;
      if (to < 0 || to >= state.formations.length) return state;
      const next = [...state.formations];
      [next[action.index], next[to]] = [next[to]!, next[action.index]!];
      return { ...state, formations: next, ...pushHistory(state) };
    }
    case 'insertAfter': {
      const next = [...state.formations];
      next.splice(action.index + 1, 0, action.formation);
      return { ...state, formations: next, ...pushHistory(state) };
    }
    case 'duplicate': {
      const cur = state.formations[action.index];
      if (!cur) return state;
      const dup: EditableFormation = { ...cur, _uid: action.uid };
      const next = [...state.formations];
      next.splice(action.index + 1, 0, dup);
      return { ...state, formations: next, ...pushHistory(state) };
    }
    case 'delete': {
      if (state.formations.length <= 1) return state;
      const next = state.formations.filter((_, i) => i !== action.index);
      return { ...state, formations: next, ...pushHistory(state) };
    }
    case 'undo': {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1]!;
      return {
        formations: prev,
        past: state.past.slice(0, -1),
        future: [state.formations, ...state.future].slice(0, HISTORY_LIMIT),
      };
    }
    case 'redo': {
      if (state.future.length === 0) return state;
      const next = state.future[0]!;
      return {
        formations: next,
        past: [...state.past, state.formations].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
      };
    }
  }
}

/** Helper: cumulative start times for a formation list. */
export function startTimes(formations: readonly EditableFormation[]): number[] {
  let cum = 0;
  return formations.map((f) => {
    const s = cum;
    cum += f.dur;
    return s;
  });
}

export function totalDuration(formations: readonly EditableFormation[]): number {
  return formations.reduce((s, f) => s + f.dur, 0);
}

export type { EditableFormation, EasingName, PaletteKey };

export const _internal = { HISTORYLESS };
