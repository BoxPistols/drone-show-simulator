# Astra Flock — Drone Show

> **星群** — A flock of 660 artificial stars.

東京湾の夜空に 660 機のドローンで 9 演目を描く、Three.js ベースの観賞ビューアと
振付エディタ。Vite + React + TypeScript の SPA。

**本番**: https://drone-show-astra-flock.vercel.app  
(`drone-show-simulator.vercel.app` は alias、307 redirect)

![OG](og-image.png)

---

## 機能ハイライト

### 観賞 (`/`)
- Three.js ポイントクラウドで **660 機 × 9 演目** を描画
- 演目: 球体 → 単螺旋 → 円環 → 波紋 → **熊 (Rilakkuma-ish)** → 二重螺旋 → 立方体 → 心臓 → **銀河 (フィナーレ)**
- 下から見上げる斜めカメラデフォルト、マウスドラッグ / ホイールでオービット
- **視点**: 観客（ドラッグ回転 / ホイール・ピンチで距離）、**機体目線**（機体のカメラから編隊を見る。ドラッグで見回し、ホイール・ピンチで画角。「別の機体へ」で乗り換え）、**360°**（編隊のまわりを 20 秒で一周しつつ高さと距離がゆるく揺れる）
- **アンビエント音楽**: 音源ファイルを持たず Web Audio で生成（パッド + 風 + 鈴 + ステレオディレイ）。ON/OFF と音量、演目ごとに和音が移る。初めて ON にしたときだけコードを読み込む
- キーボード: `Space` 再生, `←→` 演目, `1-9` ジャンプ, `+-` 速度, `C` 視点切替, `V` 別の機体の目線, `M` 音楽, `F` 全画面, `S` スクリーンショット, `T` 設定, `?` ヘルプ, `Esc` 閉じる
- タッチ: ドラッグで回転、ピンチで距離。設定パネルはトランスポートの歯車ボタンから（キーボード無しでも開ける）
- **軽量モード** (設定パネル): 解像度上限 1 倍・残像なし・星半減。描画が間に合わない端末では自動で切り替わる
- `?f=<0..8>&speed=<n>` で URL deep-link、localStorage で設定永続化

### 振付エディタ (`/choreography`)
- 演目の **追加 / 複製 / 削除 / ↑↓ 並び替え** + undo/redo (`Cmd/Ctrl+Z`, `Y`)
- パラメータ (高度 / 広がり / 遷移速度 / 補間曲線 / パレット上書き / 配分機数) を全てプレビューに視覚反映
- 3D 投影プレビュー (show と同じ `formations` を Y 軸回転 + 透視投影で再現)
- **音源 upload** + 波形描画 (Web Audio API `decodeAudioData` + peak detection)
- 再生/停止/シーク/ループ同期、block 左端ハンドルドラッグで開始時刻調整
- **BPM + ビートグリッド** + snap-to-beat (threshold 0.2 beat)
- **JSON round-trip**: 演目書出 / 読込 / 名前付きプリセット (localStorage)
- **機体書出**: 実機連携用 flightpath JSON (schema `astra-flock-flightpath/1`)

### 運用 (`/fleet`, `/schedule`)
- Fleet: 660 機 roster + 詳細 drawer + 4 アクション (test/recalibrate/log/maint), grid/table 切替
- Schedule: 月カレンダー + イベント drawer + pre-flight state サマリ + checklist

---

## クイックスタート

```bash
# 依存インストール (pnpm 必須、Node 22+)
pnpm install

# 開発サーバー (Vite, HMR)
pnpm dev
# → http://localhost:8080

# 本番ビルド (dist/)
pnpm build

# プレビュー (build 後)
pnpm preview
```

---

## デプロイ (Vercel)

`vercel.json` で Vite preset を明示。リポジトリを Vercel に接続すれば自動デプロイ。

| 設定 | 値 |
|---|---|
| Framework | `vite` |
| Build Command | `pnpm build` |
| Output Directory | `dist` |
| SPA fallback | `/(.*) → /index.html` |

セキュリティヘッダ一式 (HSTS / CSP / COOP / X-Frame-Options / Permissions-Policy) も `vercel.json` に集約。CSP は `script-src 'self'` のみで `unsafe-eval` 不要 (Vite ビルド済 JS のため)。

---

## アーキテクチャ

```
src/
├── main.tsx              ─ React + React Router エントリ
├── routes/
│   ├── show/             ─ Three.js scene を React でラップ
│   ├── choreography/     ─ store + components + audio sync
│   ├── fleet/            ─ roster + grid/table + drawer
│   ├── schedule/         ─ Calendar + EventDrawer
│   └── NotFoundPage.tsx  ─ 404 (React Router catch-all)
├── components/           ─ 共通 UI primitives + icons
├── hooks/                ─ useDirty, useKeyboard 等
├── lib/                  ─ formations / showSchema / shapes (純粋関数)
├── data/                 ─ fleet / schedule の typed data
├── styles/               ─ tokens.css + chrome.css + global.css + reset.css
├── types/
└── test/                 ─ vitest setup
```

ルーティングは React Router v6。各 route 配下に専用 components/ + hooks/ + types.ts。

---

## パフォーマンス方針

「それなりの環境でなくても見られる」ことを最優先にしている。手を入れるときは次を守る。

**読み込み**
- ページは route 単位で分割（`main.tsx` の `lazy`）。Three.js（gzip 114KB、JS の過半）は観賞ページだけが読み、`/fleet` `/choreography` `/schedule` では一切ダウンロードしない（E2E で担保）
- `index.html` にインラインの最小 CSS と読み込み表示を置き、JS が届く前から画面を出す。React 側は同じ見た目の `HydrateFallback` で引き継ぐ
- Web フォントは `preload` で取得だけ始め、`main.tsx` が適用する（描画をブロックしない）。Shippori Mincho は 500 の 1 ウェイトのみ。CJK フォントは 1 ウェイトで数百 KB になるため、12px 以下のボタン・ラベルには使わず OS の日本語サンセリフを使う
- `/assets/*` はハッシュ付きなので `Cache-Control: immutable`（`vercel.json`）

**観賞ページ (WebGL)** — `useDroneShow.ts`
- `antialias` と `preserveDrawingBuffer` は切る（点スプライトには効かず、モバイル GPU で高くつく）。スクリーンショットは描いた直後の同じタスクで読み出す
- 解像度は devicePixelRatio 1.5 倍を上限に、フレーム時間を測って 0.75 倍まで自動で下げる（`hooks/resolution.ts`、純粋ロジックでテスト済み）。「遅い」の基準は表示装置のリフレッシュ間隔の推定値から決め、30Hz の表示を過負荷と誤判定しない。下限でも遅ければ軽量モードへ切り替えてトーストで知らせる。この自動切替は今回の表示だけで、保存される設定には書かない
- タブが隠れたら止まる。一時停止中はカメラが止まった時点で描画もやめる。残像を切っているときは残像の描画自体をしない
- 半透明の UI に `backdrop-filter`（ぼかし）は使わない。動き続ける canvas の上では毎フレームぼかし直しになり、非力な GPU で最も重い処理になる
- HUD の更新は 5 回/秒、各オーバーレイは `memo` 化し、tick ごとにページ全体を描き直さない
- 機体目線では点の大きさに上限（頂点シェーダ）を設け、カメラの隣の機体が画面いっぱいの光にならないようにする
- 音楽は音源ファイルを持たず Web Audio のノード十数個で生成する（音声スレッドで動き、JS は数秒に一度鈴を鳴らすだけ）。AudioContext は利用者の操作の中で作り、タブが隠れたら止める

**振付エディタ**
- 再生時計は ref（`clock.ts`）で持ち、React の state は 15 回/秒だけ更新する。プレビュー canvas は自前の `requestAnimationFrame` で時計を直接読む。シークは時計の `version` を上げるので、一時停止中でも読み手は描き直すべきと分かる
- 発光スプライトは `lib/glowSprite.ts` を観賞ページと共用し、見た目を揃える。色文字列は `#rgb` / `rgb()` / 色名を受け、読めなければ白で描く
- プレビューは発光スプライトを `drawImage` する（全面 `blur` はしない）。サイズは `ResizeObserver` で変わったときだけ取り直す
- ビートグリッド（最大 2000 本）、波形（200 本）、演目リスト、インスペクターは入力が変わらない限り描き直さない

## セキュリティ

- CSP `default-src 'self'` 基線 + `script-src 'self'` (CDN 経由スクリプト無し)
- Google Fonts (`fonts.googleapis.com` / `fonts.gstatic.com`) のみ style/font で許可
- HSTS / X-Frame-Options DENY / COOP same-origin / Referrer-Policy `strict-origin-when-cross-origin`
- localStorage 入出力は JSON.parse 失敗時にデフォルト fallback

---

## 開発コマンド

| Command | 内容 |
|---|---|
| `pnpm dev` | Vite dev サーバー (HMR, http://localhost:8080) |
| `pnpm build` | 本番ビルド → `dist/` |
| `pnpm preview` | build 成果物のローカル配信 (http://localhost:8080) |
| `pnpm typecheck` | `tsc -b --pretty` |
| `pnpm lint` | ESLint (`--max-warnings=0`) |
| `pnpm lint:fix` | ESLint + autofix |
| `pnpm format` / `format:check` | Prettier |
| `pnpm test` | Vitest (176 件, ~3s) |
| `pnpm test:watch` / `test:coverage` | watch / カバレッジ |
| `pnpm test:e2e` | Playwright E2E (24 件, chromium) |
| `pnpm test:e2e:install` | chromium ブラウザ初回取得 |
| `pnpm test:e2e:ui` | Playwright UI モード |
| `pnpm replay <file>` | flightpath JSON の CLI 再生デモ |

### pre-commit

`husky` + `lint-staged` で staged ファイルのみ:
- `*.{ts,tsx}` → `eslint --fix --no-warn-ignored` + `prettier`
- 他 → `prettier`

Vitest / E2E は CI 側で担保。

---

## CI

`.github/workflows/test.yml` (push to main / 全 pull_request):
- `test` job: lint → typecheck → format:check → vitest → replay syntax → build
- `e2e` job (`needs: test`): chromium キャッシュ → build → playwright → report artifact

---

## ハンドオフ元

Claude Design (claude.ai/design) で HTML/CSS/JS プロトタイプとして作成されたものを、React SPA として再実装。デザインの意図・使い方は [`HANDOFF-README.md`](./HANDOFF-README.md) を参照。

## ライセンス / クレジット

- Three.js (MIT) / React / React-DOM / React Router (MIT)
- Poppins / Shippori Mincho (Google Fonts, OFL)

本リポジトリ自体は内部 PoC。外部配布時はライセンス明記要。
