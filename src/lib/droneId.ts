import { DRONE_COUNT } from './formations';

/**
 * 機体 ID と編隊内の番号（0 始まり）の対応。機体管理（/fleet）の `AS-001` と、観賞ページの点群の
 * 0 番目の点は同じ機体を指す。両方の画面がこのファイルだけを通して変換するので、対応がずれない。
 */

const PREFIX = 'AS-';

export function droneIdFromIndex(index: number): string {
  return `${PREFIX}${String(index + 1).padStart(3, '0')}`;
}

/**
 * 人が入力した ID を番号に直す。`AS-042` `as-42` `42` を受け、範囲外や読めないものは null。
 * URL の `?pov=` もここを通す。
 */
export function indexFromDroneId(raw: string, count: number = DRONE_COUNT): number | null {
  const m = /^\s*(?:as-?)?0*(\d{1,4})\s*$/i.exec(raw);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isInteger(n) || n < 1 || n > count) return null;
  return n - 1;
}

/** ID 順で前後の機体へ。未選択（-1）から進むと先頭、戻ると末尾 */
export function stepDroneIndex(current: number, dir: 1 | -1, count: number = DRONE_COUNT): number {
  if (count <= 0) return -1;
  if (current < 0 || current >= count) return dir === 1 ? 0 : count - 1;
  return (current + dir + count) % count;
}

/** その機体の目線で観賞ページを開く URL（機体管理の詳細から使う。共有もできる） */
export function povHref(index: number): string {
  return `/?pov=${droneIdFromIndex(index)}`;
}
