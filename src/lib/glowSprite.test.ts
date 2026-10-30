import { describe, expect, it } from 'vitest';
import { makeGlowSprite, parseColor } from './glowSprite';

/** 2D context の fillStyle 正規化だけを真似る */
function fakeCtx(known: Record<string, string>): CanvasRenderingContext2D {
  let current = '#000000';
  return {
    get fillStyle() {
      return current;
    },
    set fillStyle(v: string) {
      if (/^#[0-9a-f]{6}$/i.test(v)) current = v;
      else if (known[v]) current = known[v]!;
      // 未知の色は無視（ブラウザと同じ）
    },
  } as unknown as CanvasRenderingContext2D;
}

describe('parseColor', () => {
  it('reads #rgb, #rrggbb and #rrggbbaa', () => {
    expect(parseColor('#fff')).toEqual([255, 255, 255]);
    expect(parseColor('#FF69B4')).toEqual([255, 105, 180]);
    expect(parseColor('#ff69b480')).toEqual([255, 105, 180]);
    expect(parseColor(' #31a9c7 ')).toEqual([49, 169, 199]);
  });

  it('reads rgb() / rgba() in comma and space syntax, clamping to 0..255', () => {
    expect(parseColor('rgb(1, 2, 3)')).toEqual([1, 2, 3]);
    expect(parseColor('rgba(10 20 30 / 0.5)')).toEqual([10, 20, 30]);
    expect(parseColor('rgb(300, -5, 12.6)')).toEqual([255, 0, 13]);
  });

  it('falls back to the canvas for named colors and returns null for garbage', () => {
    expect(parseColor('hotpink')).toBeNull();
    const ctx = fakeCtx({ hotpink: '#ff69b4' });
    expect(parseColor('hotpink', ctx)).toEqual([255, 105, 180]);
    expect(parseColor('not-a-color', ctx)).toBeNull();
    expect(parseColor('#12', ctx)).toBeNull();
  });
});

describe('makeGlowSprite', () => {
  it('returns a canvas of the requested size even without a 2D context (test DOM)', () => {
    const cv = makeGlowSprite(24, [255, 0, 0]);
    expect(cv.width).toBe(24);
    expect(cv.height).toBe(24);
  });
});
