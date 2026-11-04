/**
 * 紹介動画に使うアプリの画面を撮り直す。
 *
 *   pnpm --dir video capture
 *
 * 親ディレクトリのアプリを Vite で起動し、4 画面を 1920×1080 で撮って public/ に置く。
 * Playwright はアプリ側（親の node_modules の @playwright/test）のものを使う。
 * 3D 表示のため、GPU の無い環境でもソフトウェア描画（SwiftShader）で WebGL を有効にして撮る。
 * Playwright のブラウザが入っていない環境では CHROMIUM_PATH で手元の Chromium を指定できる。
 */
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, '../..');
const outDir = path.resolve(here, '../public');
const PORT = 5299;
const BASE = `http://localhost:${PORT}`;

const SHOTS = [
  // 観賞は演目が組み上がってから撮る。?f= で演目を指定できる
  { path: '/?f=7', file: 'show.jpg', wait: 7000 },
  // 機体目線：観客の視点のまま、4 機の目線を小窓で重ねる
  { path: '/?f=0&pip=AS-090,AS-240,AS-400,AS-560', file: 'pov.jpg', wait: 7000 },
  { path: '/fleet', file: 'fleet.jpg', wait: 2500 },
  { path: '/choreography', file: 'choreo.jpg', wait: 4000 },
  { path: '/schedule', file: 'schedule.jpg', wait: 2500 },
];

// このアプリの index.html の <title>。ポートに別のサーバーが居ても、その画面を撮らないための目印
const appHtml = await readFile(path.join(appDir, 'index.html'), 'utf8');
const APP_TITLE = appHtml.match(/<title>([^<]+)<\/title>/)?.[1];
if (!APP_TITLE) throw new Error('index.html has no <title>');

// pnpm exec を挟むと終了の合図が vite まで届かず残るので、vite を node で直接起動する。
// 起動に失敗したとき（ポートが使用中など）に理由が分かるよう、エラー出力だけはそのまま流す
const viteBin = path.join(appDir, 'node_modules/vite/bin/vite.js');
const server = spawn(process.execPath, [viteBin, '--port', String(PORT), '--strictPort'], {
  cwd: appDir,
  stdio: ['ignore', 'ignore', 'inherit'],
});
let serverExit = null;
server.on('exit', (code, signal) => {
  serverExit = { code, signal };
});

// finally は終了シグナルでは走らないので、Ctrl-C や kill のときもここで vite を止めてから終わる
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    server.kill();
    process.exit(1);
  });
}

async function waitForServer(url, timeoutMs = 30000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (serverExit) {
      throw new Error(
        `vite exited before it was ready (code ${serverExit.code}). Is port ${PORT} already in use?`
      );
    }
    let html = null;
    try {
      const res = await fetch(url);
      if (res.ok) html = await res.text();
    } catch {
      // まだ起動していない
    }
    if (html !== null) {
      if (html.includes(APP_TITLE)) return;
      throw new Error(`port ${PORT} is serving something other than this app`);
    }
    await sleep(300);
  }
  throw new Error(`dev server did not start: ${url}`);
}

try {
  await waitForServer(BASE);
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  // 途中で失敗しても（WebGL が使えないと分かったときなど）ブラウザを必ず閉じる
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    for (const shot of SHOTS) {
      await page.goto(BASE + shot.path, { waitUntil: 'networkidle' });
      await page.waitForTimeout(shot.wait);
      if (await page.locator('.webgl-notice').count()) {
        throw new Error(`WebGL unavailable while capturing ${shot.path}`);
      }
      await page.screenshot({ path: path.join(outDir, shot.file), type: 'jpeg', quality: 88 });
      console.log('captured', shot.file);
    }
  } finally {
    await browser.close();
  }
} finally {
  server.kill();
}
