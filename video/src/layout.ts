/**
 * 横長（YouTube・サイト用）と縦長（SNS 用）で変わる寸法をまとめる。
 * シーンの中身は同じで、置き場所と文字の大きさだけを切り替える。
 */
export type Layout = {
  width: number;
  height: number;
  /** 画面の縁からの余白 */
  pad: number;
  cloud: {
    /** オープニング（タイトルの上） */
    opening: { x: number; y: number; scale: number };
    /** 演目（説明文を避けた位置） */
    formations: { x: number; y: number; scale: number };
    /** 締め */
    outro: { x: number; y: number; scale: number };
  };
  opening: { bottom: number; title: number; tagline: number };
  formation: {
    top: number;
    number: number;
    name: number;
    desc: number;
    descWidth: number;
    /** 「9 FORMATIONS」の置き場所 */
    badge: 'bottom-right' | 'bottom-center';
  };
  feature: {
    /** 画面写真の枠 */
    shot: { left: number; top: number; width: number; height: number };
    /** 見出しと説明の箱 */
    caption: { left: number; top: number; width: number };
    title: number;
    line: number;
  };
  outro: { bottom: number; lead: number; title: number; url: number; stacked: boolean };
};

export const LANDSCAPE: Layout = {
  width: 1920,
  height: 1080,
  pad: 120,
  cloud: {
    opening: { x: 960, y: 390, scale: 2.9 },
    formations: { x: 1090, y: 560, scale: 3.6 },
    outro: { x: 960, y: 370, scale: 3.6 },
  },
  opening: { bottom: 96, title: 132, tagline: 30 },
  formation: {
    top: 150,
    number: 120,
    name: 84,
    desc: 24,
    descWidth: 560,
    badge: 'bottom-right',
  },
  feature: {
    shot: { left: 700, top: 200, width: 1100, height: 619 },
    caption: { left: 120, top: 330, width: 540 },
    title: 96,
    line: 27,
  },
  outro: { bottom: 150, lead: 34, title: 76, url: 26, stacked: false },
};

export const PORTRAIT: Layout = {
  width: 1080,
  height: 1920,
  pad: 80,
  cloud: {
    opening: { x: 540, y: 720, scale: 3.9 },
    formations: { x: 540, y: 1250, scale: 4.4 },
    outro: { x: 540, y: 700, scale: 4.4 },
  },
  opening: { bottom: 260, title: 150, tagline: 38 },
  formation: {
    top: 180,
    number: 128,
    name: 96,
    desc: 32,
    descWidth: 920,
    badge: 'bottom-center',
  },
  feature: {
    // 縦長では 16:9 の画面写真を小さくしすぎないよう、背の高い枠で中央を切り出す
    shot: { left: 60, top: 300, width: 960, height: 800 },
    caption: { left: 80, top: 1190, width: 920 },
    title: 112,
    line: 36,
  },
  outro: { bottom: 300, lead: 40, title: 104, url: 34, stacked: true },
};
