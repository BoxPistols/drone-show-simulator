/**
 * 動画で使う文字だけを含むフォントを Google Fonts から取ってきて public/fonts/ に置く。
 *
 *   pnpm --dir video fonts
 *
 * 日本語フォントは全文字だと数 MB になるので、Google Fonts の text= 指定で必要な文字だけにする。
 * 動画の文言（video/src）か演目の文言（src/lib/formations.ts）を変えたら、もう一度実行する。
 * 書き出し時はネットワークに頼らず、ここで置いたファイルだけを読む。
 *
 * プロキシ越しの環境では NODE_USE_ENV_PROXY=1 を付けて実行する（Node 22.21 以降）。
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const videoDir = path.resolve(here, '..');
const outDir = path.join(videoDir, 'public/fonts');

export const FONTS = [
  { family: 'Shippori Mincho', file: 'shippori-mincho', weights: [500] },
  { family: 'Poppins', file: 'poppins', weights: [300, 400, 500] },
  { family: 'Noto Sans JP', file: 'noto-sans-jp', weights: [400, 500] },
];

// woff2 を返してもらうため、新しめのブラウザを名乗る
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

async function listSources(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listSources(p)));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

async function collectText() {
  const files = [
    ...(await listSources(path.join(videoDir, 'src'))),
    path.resolve(videoDir, '../src/lib/formations.ts'),
  ];
  const chars = new Set();
  // 英数字と記号はいつでも使えるようにしておく
  for (let c = 0x20; c <= 0x7e; c++) chars.add(String.fromCharCode(c));
  for (const f of files) {
    for (const ch of await readFile(f, 'utf8')) {
      if (ch.codePointAt(0) > 0x7e) chars.add(ch);
    }
  }
  return [...chars].sort().join('');
}

async function get(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res;
}

const text = await collectText();
await mkdir(outDir, { recursive: true });

for (const font of FONTS) {
  for (const weight of font.weights) {
    const css = await (
      await get(
        `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.family)}:wght@${weight}&text=${encodeURIComponent(text)}`
      )
    ).text();
    const urls = [...css.matchAll(/url\((https:[^)]+)\)/g)].map((m) => m[1]);
    if (urls.length !== 1)
      throw new Error(`expected one font file for ${font.family} ${weight}, got ${urls.length}`);
    const buf = Buffer.from(await (await get(urls[0])).arrayBuffer());
    const name = `${font.file}-${weight}.woff2`;
    await writeFile(path.join(outDir, name), buf);
    console.log(`${name}  ${(buf.length / 1024).toFixed(1)} KB`);
  }
}
console.log(`${text.length} characters`);
