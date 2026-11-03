import { droneIdFromIndex, indexFromDroneId } from '~/lib/droneId';
import { MAX_PIPS } from './pip';

/**
 * 視点を URL で共有するための読み書き。
 *   ?pov=AS-123          … 機体目線で AS-123 に乗る
 *   ?pip=AS-010,AS-200   … 小窓で同時に見る機体（最大 4）
 */
export interface ViewParams {
  /** 乗る機体の番号。指定なし・読めないときは null */
  pov: number | null;
  /** `pov` に値はあったが機体として読めなかったときの元の文字列（利用者に知らせるため） */
  invalidPov: string | null;
  pips: number[];
}

export function parseViewParams(sp: URLSearchParams): ViewParams {
  const rawPov = sp.get('pov');
  const pov = rawPov === null ? null : indexFromDroneId(rawPov);
  const pips: number[] = [];
  for (const part of (sp.get('pip') ?? '').split(',')) {
    if (pips.length >= MAX_PIPS) break;
    const i = indexFromDroneId(part);
    if (i !== null && !pips.includes(i)) pips.push(i);
  }
  return {
    pov,
    invalidPov: rawPov !== null && rawPov.trim() !== '' && pov === null ? rawPov : null,
    pips,
  };
}

/** 現在の視点を URL に書き戻す。他の値（f, speed など）はそのまま残す */
export function writeViewParams(
  sp: URLSearchParams,
  view: { pov: number | null; pips: readonly number[] }
): URLSearchParams {
  const next = new URLSearchParams(sp);
  if (view.pov !== null && view.pov >= 0) next.set('pov', droneIdFromIndex(view.pov));
  else next.delete('pov');
  if (view.pips.length > 0) next.set('pip', view.pips.map(droneIdFromIndex).join(','));
  else next.delete('pip');
  return next;
}
