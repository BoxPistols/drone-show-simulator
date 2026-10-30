/**
 * アンビエント音楽の音階。ヨナ抜き（メジャーペンタトニック）なので、どの音を重ねても濁らない。
 * 純粋な計算だけをここに置き、Web Audio を使う部分（ambient.ts）と分けてテストしやすくする。
 */

/** 根音 A2 */
export const ROOT_HZ = 110;
/** メジャーペンタトニック（半音） */
export const PENTATONIC = [0, 2, 4, 7, 9] as const;

export function semitoneToHz(semitone: number, root = ROOT_HZ): number {
  return root * Math.pow(2, semitone / 12);
}

/**
 * 演目 index → パッドの和音（根音からの半音）。
 * 演目が変わるたびに根音がペンタトニック上を一段ずれ、5 度・オクターブ・9 度・オクターブ上の 5 度を重ねる
 * （sus / add9 の浮いた響き）。
 */
export function chordForFormation(index: number): number[] {
  const i = ((index % PENTATONIC.length) + PENTATONIC.length) % PENTATONIC.length;
  const root = PENTATONIC[i]!;
  return [root, root + 7, root + 12, root + 14, root + 19];
}

/** 鈴の音。和音の根音の上 2〜3 オクターブで、ペンタトニックから一つ選ぶ */
export function bellSemitone(formationIndex: number, rand: number): number {
  const base = chordForFormation(formationIndex)[0]!;
  const degree = PENTATONIC[Math.min(PENTATONIC.length - 1, Math.floor(rand * PENTATONIC.length))]!;
  const octave = rand < 0.5 ? 24 : 36;
  return base + degree + octave;
}
