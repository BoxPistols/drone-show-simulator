import { useEffect, useRef } from 'react';
import { findFormation } from '~/lib/formations';
import { ease } from '~/lib/easing';
import { PALETTES } from '~/lib/formations';
import { PALETTE_KEYS } from '~/types/formations';
import type { EditableFormation, PaletteKey } from '~/types/formations';

interface Props {
  formation: EditableFormation;
  time: number;
  total: number;
}

/**
 * Mini 3D-projected preview using the EXACT shape targets the show uses,
 * rendered to a 2D canvas via simple Y-axis rotation + perspective so the
 * choreography editor and the live show stay visually consistent.
 */
export function Preview({ formation, time, total }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;
    ctx.clearRect(0, 0, W, H);

    const lookup = formation.typeId || formation.id;
    const fdata = findFormation(lookup);
    if (!fdata) return;
    const targets = fdata.targets;
    const N_total = fdata.targets.length / 3;

    const altOffset = (formation.altitude || 60) - 60;
    const spreadScale = (formation.spread || 55) / 55;
    const trans = formation.speed || 1;
    const N_draw = Math.max(40, Math.round((N_total * (formation.drones || 660)) / 660));

    const progress = total > 0 ? (time % total) / total : 0;
    const easedV = ease(formation.easing, progress);
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
      formation.paletteOverride &&
      (PALETTE_KEYS as readonly string[]).includes(formation.paletteOverride)
        ? formation.paletteOverride
        : null;
    const ov = ovKey ? PALETTES[ovKey] : null;
    const baseColor = ov ? ov.colors[0] : formation.color;
    const accentColor = ov ? ov.colors[1] : formation.color;

    const points: { sx: number; sy: number; depth: number; persp: number; i: number }[] = [];
    for (let i = 0; i < N_draw; i++) {
      const wx = targets[i * 3]!;
      const wy = targets[i * 3 + 1]! + altOffset;
      const wz = targets[i * 3 + 2]!;
      const rx = wx * cosR + wz * sinR;
      const rz = -wx * sinR + wz * cosR;
      const persp = camDist / Math.max(1, camDist - rz);
      const sx = cx + rx * scale * persp;
      const sy = cy - (wy - worldCenter) * scale * persp;
      points.push({ sx, sy, depth: rz, persp, i });
    }
    points.sort((a, b) => a.depth - b.depth);

    for (const p of points) {
      ctx.fillStyle = ov && p.i % 4 === 0 ? accentColor : baseColor;
      const twinkle = 0.7 + Math.sin(p.i * 0.3 + rotY * 2) * 0.3;
      const sz = 1.9 * pulseSz * twinkle * Math.max(0.55, p.persp);
      ctx.globalAlpha = pulseAlpha;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, sz, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 0.18;
    ctx.filter = 'blur(5px)';
    ctx.drawImage(c, 0, 0, W, H);
    ctx.filter = 'none';
  }, [formation, time, total]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
}
