/**
 * Astra Flock — shared formation algorithms + metadata (typed).
 * Single source of truth for FORMATIONS / PALETTES / SKIES / FLEET.
 *
 * Migrated from formations.js. The legacy file still exists during the SPA
 * migration so old HTML pages continue to work; both modules are byte-identical
 * in their generated targets (verified by formations.test.ts).
 */
import type {
  BaseFormation,
  ComputedFormation,
  FleetSnapshot,
  FormationId,
  Palette,
  PaletteKey,
  Sky,
  SkyKey,
} from '~/types/formations';
import {
  fBear,
  fCube,
  fDoubleHelix,
  fGalaxy,
  fHeart,
  fHelix,
  fSphere,
  fTorus,
  fWave,
} from './shapes';

export const DRONE_COUNT = 660;

const SHAPE_FNS: Record<FormationId, (n: number) => Float32Array> = {
  sphere: fSphere,
  helix: fHelix,
  torus: fTorus,
  wave: fWave,
  bear: fBear,
  dna: fDoubleHelix,
  cube: fCube,
  heart: fHeart,
  galaxy: fGalaxy,
};

const FORMATION_DEFS: readonly BaseFormation[] = [
  {
    id: 'sphere',
    jp: '球体',
    en: 'Sphere of Stars',
    desc: '660機のドローンが均等に配置され、完全な球体を描く。最もシンプルで、最も幾何学的な形。',
    dur: 42,
    color: '#6ed3e6',
  },
  {
    id: 'helix',
    jp: '単螺旋',
    en: 'Ascending Helix',
    desc: '螺旋状に昇り、観客の視線を天へ導く。東京湾の夜空に立ち上がる一本の光の柱。',
    dur: 38,
    color: '#d429e0',
  },
  {
    id: 'torus',
    jp: '円環',
    en: 'Torus Ring',
    desc: 'ドーナツ状のトーラス面上に配置。観客が真下から見上げると環が空を縁取る。',
    dur: 36,
    color: '#ffb347',
  },
  {
    id: 'wave',
    jp: '波紋',
    en: 'Ripple Grid',
    desc: '均等な格子の上を、サインとコサインで定義された波がゆるやかに伝播する。',
    dur: 44,
    color: '#31a9c7',
  },
  {
    id: 'bear',
    jp: '熊',
    en: 'Bear Silhouette',
    desc: '中盤のひと息。クマの顔のクローズアップ。頭 + 丸い耳 + 離れた目 + マズル。観客との視線交換。',
    dur: 54,
    color: '#d4915c',
  },
  {
    id: 'dna',
    jp: '二重螺旋',
    en: 'Double Helix',
    desc: '二本の螺旋が絡み合う、生命の構造。22機ごとに配されたラングが結合を表現する。',
    dur: 40,
    color: '#98ff9e',
  },
  {
    id: 'cube',
    jp: '立方体',
    en: 'Wireframe Cube',
    desc: '12本のエッジ上に55機ずつ配置。辺と頂点だけで、立方体の輪郭を空中に描く。',
    dur: 34,
    color: '#ff69b4',
  },
  {
    id: 'heart',
    jp: '心臓',
    en: 'Pulse of Love',
    desc: 'パラメトリック方程式による心臓形。フィナーレ前の、観客への静かな挨拶。',
    dur: 32,
    color: '#ff6b7a',
  },
  {
    id: 'galaxy',
    jp: '銀河',
    en: 'Spiral Galaxy',
    desc: '最終演目。四本腕の渦巻銀河。660 個の恒星が夜空いっぱいに旋回し、閉幕を飾る。',
    dur: 48,
    color: '#c5b3ff',
  },
] as const;

function buildFormations(count: number): readonly ComputedFormation[] {
  let cumulative = 0;
  return FORMATION_DEFS.map((def) => {
    const start = cumulative;
    cumulative += def.dur;
    return Object.freeze({
      ...def,
      targets: SHAPE_FNS[def.id](count),
      start,
    });
  });
}

export const FORMATIONS: readonly ComputedFormation[] = buildFormations(DRONE_COUNT);

export const TOTAL_TIME: number = FORMATIONS.reduce((s, f) => s + f.dur, 0);

export const PALETTES: Readonly<Record<PaletteKey, Palette>> = Object.freeze({
  aurora: { name: 'Aurora', jp: '極光', colors: ['#31a9c7', '#d429e0', '#98ff9e', '#ffe58a'] },
  sakura: { name: 'Sakura', jp: '桜', colors: ['#ffb7c5', '#ff69b4', '#ffffff', '#e8c4ff'] },
  ember: { name: 'Ember', jp: '炎', colors: ['#ff6b35', '#ffb347', '#ffe58a', '#d429e0'] },
  mono: { name: 'Mono', jp: '白', colors: ['#ffffff', '#f0f8ff', '#cfe7ff', '#ffe58a'] },
  flock: { name: 'Flock', jp: '星群', colors: ['#31a9c7', '#5b21b6', '#ff69b4', '#ffffff'] },
});

export const SKIES: Readonly<Record<SkyKey, Sky>> = Object.freeze({
  night: { name: 'Night', jp: '夜', bg: ['#02030a', '#070a1a', '#0e1530'] },
  twilight: { name: 'Twilight', jp: '黄昏', bg: ['#1a0f2a', '#3d1a4f', '#1a1438'] },
  dawn: { name: 'Dawn', jp: '夜明', bg: ['#1a1228', '#3d2650', '#4f3250'] },
});

/**
 * Fleet distribution snapshot. Active 600 + Charging 32 + Standby 18 + Maint 10 = 660.
 * Mirror of the deterministic seed used by fleet.tsx generateFleet().
 */
export const FLEET: FleetSnapshot = Object.freeze({
  total: 660,
  active: 600,
  charging: 32,
  standby: 18,
  maint: 10,
  available: 600,
  nonFlyable: 10,
  reservable: 50,
});

export function findFormation(id: string): ComputedFormation | undefined {
  return FORMATIONS.find((f) => f.id === id);
}

export function isFormationId(value: string): value is FormationId {
  return value in SHAPE_FNS;
}
