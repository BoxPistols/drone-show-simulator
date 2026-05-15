import { describe, expect, it } from 'vitest';
import {
  HISTORY_LIMIT,
  initialState,
  makeEditable,
  reducer,
  startTimes,
  totalDuration,
  type ChoreographyState,
} from './store';

const baseFormation = makeEditable(
  { id: 'sphere', jp: '球体', en: 'Sphere', desc: '', dur: 30, color: '#000' },
  'test-1'
);

function withFresh(): ChoreographyState {
  return {
    formations: [
      makeEditable({ id: 'sphere', jp: 'a', en: 'A', desc: '', dur: 10, color: '#000' }, 'a'),
      makeEditable({ id: 'helix', jp: 'b', en: 'B', desc: '', dur: 20, color: '#000' }, 'b'),
      makeEditable({ id: 'torus', jp: 'c', en: 'C', desc: '', dur: 30, color: '#000' }, 'c'),
    ],
    past: [],
    future: [],
  };
}

describe('choreography store / reducer', () => {
  it('initialState seeds 9 formations', () => {
    expect(initialState().formations).toHaveLength(9);
  });

  it('patch updates a single formation without touching history', () => {
    const state = withFresh();
    const next = reducer(state, { type: 'patch', index: 1, patch: { dur: 99 } });
    expect(next.formations[1]?.dur).toBe(99);
    expect(next.past).toHaveLength(0);
  });

  it('setDur clamps to a minimum of 5 seconds', () => {
    const state = withFresh();
    const next = reducer(state, { type: 'setDur', index: 0, dur: -3 });
    expect(next.formations[0]?.dur).toBe(5);
  });

  it('move swaps adjacent formations and snapshots history', () => {
    const state = withFresh();
    const next = reducer(state, { type: 'move', index: 0, dir: 1 });
    expect(next.formations[0]?._uid).toBe('b');
    expect(next.formations[1]?._uid).toBe('a');
    expect(next.past).toHaveLength(1);
  });

  it('move is a no-op at boundaries', () => {
    const state = withFresh();
    expect(reducer(state, { type: 'move', index: 0, dir: -1 })).toBe(state);
    expect(reducer(state, { type: 'move', index: 2, dir: 1 })).toBe(state);
  });

  it('insertAfter places the new formation immediately after the index', () => {
    const state = withFresh();
    const inserted = makeEditable(
      { id: 'wave', jp: '波', en: 'Wave', desc: '', dur: 12, color: '#000' },
      'new-1'
    );
    const next = reducer(state, { type: 'insertAfter', index: 0, formation: inserted });
    expect(next.formations).toHaveLength(4);
    expect(next.formations[1]?._uid).toBe('new-1');
  });

  it('duplicate copies the selected formation with a fresh uid', () => {
    const state = withFresh();
    const next = reducer(state, { type: 'duplicate', index: 1, uid: 'dup-1' });
    expect(next.formations).toHaveLength(4);
    expect(next.formations[2]?._uid).toBe('dup-1');
    expect(next.formations[2]?.jp).toBe(state.formations[1]?.jp);
  });

  it('delete refuses when only one formation remains', () => {
    const single: ChoreographyState = {
      formations: [baseFormation],
      past: [],
      future: [],
    };
    expect(reducer(single, { type: 'delete', index: 0 })).toBe(single);
  });

  it('replace pushes the previous list onto past', () => {
    const state = withFresh();
    const next = reducer(state, { type: 'replace', formations: [baseFormation] });
    expect(next.formations).toHaveLength(1);
    expect(next.past).toHaveLength(1);
    expect(next.future).toHaveLength(0);
  });

  it('undo restores the previous formations and pushes future', () => {
    const state = withFresh();
    const moved = reducer(state, { type: 'move', index: 0, dir: 1 });
    const undone = reducer(moved, { type: 'undo' });
    expect(undone.formations.map((f) => f._uid)).toEqual(['a', 'b', 'c']);
    expect(undone.future).toHaveLength(1);
    expect(undone.past).toHaveLength(0);
  });

  it('redo replays a previously-undone change', () => {
    const state = withFresh();
    const moved = reducer(state, { type: 'move', index: 0, dir: 1 });
    const undone = reducer(moved, { type: 'undo' });
    const redone = reducer(undone, { type: 'redo' });
    expect(redone.formations.map((f) => f._uid)).toEqual(['b', 'a', 'c']);
  });

  it('history is capped at HISTORY_LIMIT entries', () => {
    let s = withFresh();
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
      s = reducer(s, { type: 'replace', formations: s.formations });
    }
    expect(s.past.length).toBe(HISTORY_LIMIT);
  });
});

describe('startTimes / totalDuration', () => {
  it('startTimes is cumulative starting at 0', () => {
    const fs = withFresh().formations;
    expect(startTimes(fs)).toEqual([0, 10, 30]);
  });
  it('totalDuration sums durations', () => {
    expect(totalDuration(withFresh().formations)).toBe(60);
  });
});
