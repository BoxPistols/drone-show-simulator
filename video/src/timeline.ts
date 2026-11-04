/*
 * 動画の時間割（30fps）。映像（Intro.tsx）と音楽（scripts/music.ts）の両方がここを読む。
 * 音楽の生成は Node で直接動かすので、このファイルは何も import しない。
 *
 *   0–150    オープニング：地上の機体が離陸して球体になり、タイトルが出る
 * 150–540    演目：単螺旋 → 熊 → 立方体 → 心臓 → 銀河 と組み替わる
 * 540–930    画面紹介：観賞・機体目線・振付・機体・運航の 5 つ
 * 930–1080   締め：銀河の下にタイトルと URL
 */
export const FPS = 30;

export const SCENES = {
  opening: { from: 0, dur: 150 },
  formations: { from: 150, dur: 390 },
  features: { from: 540, dur: 390 },
  outro: { from: 930, dur: 150 },
} as const;

export const TOTAL_FRAMES = SCENES.outro.from + SCENES.outro.dur;

/** 動画で見せる演目（アプリの formations の id）。並びは本番の公演と同じ順 */
export const FORMATION_ORDER = ['helix', 'bear', 'cube', 'heart', 'galaxy'] as const;
export const FORMATION_SLOT = SCENES.formations.dur / FORMATION_ORDER.length; // 78

/** アプリの演目の並び。和音は演目の番号で決まる（src/routes/show/audio/scale.ts の chordForFormation） */
export const APP_FORMATION_IDS = [
  'sphere',
  'helix',
  'torus',
  'wave',
  'bear',
  'dna',
  'cube',
  'heart',
  'galaxy',
] as const;

export const FEATURE_COUNT = 5;
export const FEATURE_SLOT = SCENES.features.dur / FEATURE_COUNT; // 78

/** 演目シーンの i 番目が始まるフレーム */
export function formationStart(i: number): number {
  return SCENES.formations.from + i * FORMATION_SLOT;
}

/** 画面紹介の i 番目が始まるフレーム（シーン内の相対値） */
export function featureStart(i: number): number {
  return Math.round(i * FEATURE_SLOT);
}

/** オープニングでタイトルの「星群」が浮かぶフレーム */
export const TITLE_FRAME = 52;
