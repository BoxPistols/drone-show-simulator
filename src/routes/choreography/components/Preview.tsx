import { useEffect, useRef } from 'react';
import { findFormation } from '~/lib/formations';
import { makeGlowSprite, parseColor } from '~/lib/glowSprite';
import { ease } from '~/lib/easing';
import { PALETTES } from '~/lib/formations';
import { PALETTE_KEYS } from '~/types/formations';
import type { EditableFormation, PaletteKey } from '~/types/formations';
import type { ClockRef } from '../clock';

interface Props {
  formation: EditableFormation;
  /** 再生位置（秒）。React の state を通さず毎フレーム読む */
  clockRef: ClockRef;
  /** この演目の開始時刻（秒） */
  start: number;
  total: number;
  playing: boolean;
}

/**
 * 発光する点のスプライト。色ごとに一度だけ作って使い回す（毎フレーム全面ぼかしをかけるより桁違いに安い）。
 * 色は演目の既定色とパレットで十数種だが、読み込んだ JSON には任意の色が入り得るので上限を設けて古いものから捨てる。
 * 色文字列は #rgb / rgb() / 色名のどれでも受け、読めなければ白で描く（例外で描画が止まらないように）
 */
const spriteCache = new Map<string, HTMLCanvasElement>();
const MAX_SPRITE_CACHE = 64;
const SPRITE = 32;
let scratchCtx: CanvasRenderingContext2D | null | undefined;
function sprite(color: string): HTMLCanvasElement {
  let cv = spriteCache.get(color);
  if (cv) return cv;
  if (spriteCache.size >= MAX_SPRITE_CACHE) {
    const oldest = spriteCache.keys().next().value;
    if (oldest !== undefined) spriteCache.delete(oldest);
  }
  if (scratchCtx === undefined) scratchCtx = document.createElement('canvas').getContext('2d');
  cv = makeGlowSprite(SPRITE, parseColor(color, scratchCtx) ?? [255, 255, 255]);
  spriteCache.set(color, cv);
  return cv;
}

/**
 * 観賞ページと同じ形状データを、Y 軸回転＋透視投影で 2D canvas に描く小さなプレビュー。
 *
 * React の再レンダリングとは切り離し、自前の requestAnimationFrame で描く。
 * 一時停止中は props が変わったときとシーク（clock の version が上がったとき）だけ描き直す。サイズは ResizeObserver で変わったときだけ取り直す
 * （以前は毎フレーム getBoundingClientRect と canvas の再確保をしていた）。
 */
export function Preview({ formation, clockRef, start, total, playing }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef({ formation, start, total, playing });
  propsRef.current = { formation, start, total, playing };
  const dirtyRef = useRef(true);
  useEffect(() => {
    dirtyRef.current = true;
  }, [formation, start, total, playing]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let dpr = 1;
    const resize = () => {
      const rect = c.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = Math.max(1, rect.width);
      H = Math.max(1, rect.height);
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      dirtyRef.current = true;
    };
    resize();
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            resize();
          })
        : null;
    ro?.observe(c);

    const draw = (time: number) => {
      const { formation: f, total: tot } = propsRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const fdata = findFormation(f.typeId || f.id);
      if (!fdata) return;
      const targets = fdata.targets;
      const nTotal = targets.length / 3;

      const altOffset = (f.altitude || 60) - 60;
      const spreadScale = (f.spread || 55) / 55;
      const trans = f.speed || 1;
      const nDraw = Math.max(40, Math.round((nTotal * (f.drones || 660)) / 660));

      const progress = tot > 0 ? (time % tot) / tot : 0;
      const easedV = ease(f.easing, progress);
      const pulseSz = 0.7 + easedV * 0.7;
      const pulseAlpha = 0.72 + easedV * 0.28;

      const cx = W / 2;
      const cy = H / 2 + 12;
      const worldCenter = 60;
      const R = Math.min(W, H) * 0.45;
      const scale = (R / 70) * spreadScale;
      const rotY = time * 0.4 * trans;
      const camDist = 220;
      const sinR = Math.sin(rotY);
      const cosR = Math.cos(rotY);

      const ovKey: PaletteKey | null =
        f.paletteOverride && (PALETTE_KEYS as readonly string[]).includes(f.paletteOverride)
          ? f.paletteOverride
          : null;
      const ov = ovKey ? PALETTES[ovKey] : null;
      const base = sprite(ov ? ov.colors[0] : f.color);
      const accent = sprite(ov ? ov.colors[1] : f.color);

      // 加算合成なら奥行きで並べ替える必要がない
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = pulseAlpha;
      for (let i = 0; i < nDraw; i++) {
        const wx = targets[i * 3]!;
        const wy = targets[i * 3 + 1]! + altOffset;
        const wz = targets[i * 3 + 2]!;
        const rx = wx * cosR + wz * sinR;
        const rz = -wx * sinR + wz * cosR;
        const persp = camDist / Math.max(1, camDist - rz);
        const sx = cx + rx * scale * persp;
        const sy = cy - (wy - worldCenter) * scale * persp;
        const twinkle = 0.7 + Math.sin(i * 0.3 + rotY * 2) * 0.3;
        const r = 3.6 * pulseSz * twinkle * Math.max(0.55, persp);
        ctx.drawImage(ov && i % 4 === 0 ? accent : base, sx - r, sy - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };

    let raf = 0;
    let lastVersion = -1;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const p = propsRef.current;
      const clock = clockRef.current;
      if (!p.playing && !dirtyRef.current && clock.version === lastVersion) return;
      dirtyRef.current = false;
      lastVersion = clock.version;
      draw(Math.max(0, clock.time - p.start));
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [clockRef]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
}
