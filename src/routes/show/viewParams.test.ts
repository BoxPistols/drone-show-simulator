import { describe, expect, it } from 'vitest';
import { parseViewParams, writeViewParams } from './viewParams';

const parse = (q: string) => parseViewParams(new URLSearchParams(q));

describe('parseViewParams', () => {
  it('reads pov in the fleet ID format', () => {
    expect(parse('pov=AS-123')).toEqual({ pov: 122, invalidPov: null, pips: [] });
    expect(parse('pov=as-7').pov).toBe(6);
  });

  it('reports an unreadable pov instead of silently ignoring it', () => {
    expect(parse('pov=AS-999')).toEqual({ pov: null, invalidPov: 'AS-999', pips: [] });
    expect(parse('pov=hello').invalidPov).toBe('hello');
  });

  it('treats a missing or empty pov as no selection', () => {
    expect(parse('')).toEqual({ pov: null, invalidPov: null, pips: [] });
    expect(parse('pov=')).toEqual({ pov: null, invalidPov: null, pips: [] });
  });

  it('reads up to 4 unique, valid pip ids in order', () => {
    expect(parse('pip=AS-010,AS-200,bad,AS-010,AS-300,AS-400,AS-500').pips).toEqual([
      9, 199, 299, 399,
    ]);
  });
});

describe('writeViewParams', () => {
  it('writes pov and pip and keeps unrelated params', () => {
    const out = writeViewParams(new URLSearchParams('f=3&speed=2'), { pov: 41, pips: [0, 659] });
    expect(out.get('f')).toBe('3');
    expect(out.get('speed')).toBe('2');
    expect(out.get('pov')).toBe('AS-042');
    expect(out.get('pip')).toBe('AS-001,AS-660');
  });

  it('removes them when cleared', () => {
    const out = writeViewParams(new URLSearchParams('pov=AS-001&pip=AS-002'), {
      pov: null,
      pips: [],
    });
    expect(out.toString()).toBe('');
  });

  it('round-trips through parse', () => {
    const sp = writeViewParams(new URLSearchParams(), { pov: 5, pips: [1, 2] });
    expect(parseViewParams(sp)).toEqual({ pov: 5, invalidPov: null, pips: [1, 2] });
  });
});
