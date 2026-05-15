import { describe, expect, it } from 'vitest';
import { CHECKLIST, CREW, EVENTS, TYPE_META, dateKey } from './schedule';

describe('schedule fixtures', () => {
  it('EVENTS keys are ISO YYYY-MM-DD', () => {
    for (const k of Object.keys(EVENTS)) {
      expect(k).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('every event has a type recognized by TYPE_META', () => {
    for (const e of Object.values(EVENTS)) {
      expect(TYPE_META[e.type]).toBeDefined();
    }
  });

  it('show events have audience numbers', () => {
    for (const e of Object.values(EVENTS)) {
      if (e.type === 'show' && e.audience !== undefined) {
        expect(e.audience).toBeGreaterThan(0);
      }
    }
  });

  it('CREW is non-empty and uses CONFIRMED / PENDING statuses', () => {
    expect(CREW.length).toBeGreaterThan(0);
    for (const c of CREW) {
      expect(['CONFIRMED', 'PENDING']).toContain(c.status);
    }
  });

  it('CHECKLIST exposes a label per item', () => {
    for (const c of CHECKLIST) {
      expect(c.label.length).toBeGreaterThan(0);
    }
  });

  it('dateKey zero-pads month and day', () => {
    expect(dateKey(2026, 0, 1)).toBe('2026-01-01');
    expect(dateKey(2026, 11, 31)).toBe('2026-12-31');
  });
});
