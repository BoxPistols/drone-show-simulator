import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

// アプリと同じ書体。見出しは明朝、英字のアクセントは Poppins、日本語の本文は Noto Sans JP。
// 動画で使う文字だけの woff2 を public/fonts に置いてある（scripts/fonts.mjs で作る）。
// 書き出しはネットワークに頼らない
export const FONT_MINCHO = 'Shippori Mincho';
export const FONT_DESIGN = 'Poppins';
export const FONT_SANS = 'Noto Sans JP';

const FILES: { family: string; file: string; weight: string }[] = [
  { family: FONT_MINCHO, file: 'shippori-mincho-500', weight: '500' },
  { family: FONT_DESIGN, file: 'poppins-300', weight: '300' },
  { family: FONT_DESIGN, file: 'poppins-400', weight: '400' },
  { family: FONT_DESIGN, file: 'poppins-500', weight: '500' },
  { family: FONT_SANS, file: 'noto-sans-jp-400', weight: '400' },
  { family: FONT_SANS, file: 'noto-sans-jp-500', weight: '500' },
];
for (const f of FILES) {
  void loadFont({
    family: f.family,
    url: staticFile(`fonts/${f.file}.woff2`),
    weight: f.weight,
    format: 'woff2',
  });
}

/** アプリの配色（src/routes/show/show.css と src/styles/tokens.css に合わせる） */
export const COLORS = {
  sky0: '#02030a',
  sky1: '#070a1a',
  sky2: '#0e1530',
  ink: 'rgba(10, 14, 28, 0.82)',
  hair: 'rgba(255,255,255,0.10)',
  text: '#e8eef6',
  textDim: 'rgba(232,238,246,0.62)',
  glow: '#31a9c7',
  pink: '#ff69b4',
} as const;

/** 既定のパレット「極光」。アプリの PALETTES.aurora と同じ */
export const AURORA = ['#31a9c7', '#d429e0', '#98ff9e', '#ffe58a'] as const;
