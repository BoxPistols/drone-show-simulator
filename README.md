# Astra Flock — Drone Show

東京湾の夜空に 660 機のドローンで 9 演目を描く観賞ビューのプロトタイプ。

静的サイト — Three.js / React は CDN (unpkg) から SRI 検証付きでロード。ビルド不要。

## ページ

| Path | 内容 |
| --- | --- |
| `/` → `drone-show.html` | 観賞ビュー (Three.js, 660 機ポイントクラウド) |
| `/fleet.html` | 機体一覧 (React via Babel Standalone) |
| `/choreography.html` | 振付エディタ |
| `/schedule.html` | 運航スケジュール |

## ローカル起動

```bash
npm run dev
# → http://localhost:8080
```

`npx serve` を使うので初回は `serve` を取得する通信が発生します。Python があれば `python3 -m http.server 8080` でも同じ。

## Vercel デプロイ

Vercel にリポジトリを接続すれば自動で検出されて静的配信されます。

- Framework Preset: **Other**
- Build Command: (空でよい / `npm run build` は no-op)
- Output Directory: `.`
- ルーティング・ヘッダは `vercel.json` に集約

`vercel.json` で設定している項目:

- `/` → `/drone-show.html` リライト
- `Content-Security-Policy` (unpkg / Google Fonts を明示許可、他は自前)
- `X-Content-Type-Options: nosniff` / `Referrer-Policy` / `Permissions-Policy`
- `frame-ancestors 'none'` (iframe 埋め込み禁止)

## セキュリティメモ

- `script-src` に `'unsafe-eval'` が入っているのは `fleet/choreography/schedule.html` が Babel Standalone で JSX を実行時トランスパイルしているため。将来的に JSX を事前ビルド (esbuild / Vite) すれば `'unsafe-eval'` は外せる
- Three.js は SRI hash (sha384) で固定。CDN 改ざんを検知して実行拒否
- React / React-DOM / Babel Standalone は元のハンドオフで既に SRI 付き

## 構成

```
.
├── drone-show.html          # メイン観賞ビュー
├── show.js                  # Three.js シミュレーション (660 機 + 9 演目)
├── fleet.html / .jsx        # 機体一覧
├── choreography.html / .jsx # 振付
├── schedule.html / .jsx     # 運航
├── tokens.css               # Astra Flock design tokens (色・タイポ)
├── app-chrome.css           # 共通 chrome
├── screenshots/             # デザイン参照画像
├── HANDOFF-README.md        # Claude Design からのハンドオフ原本
├── package.json / vercel.json
└── .gitignore
```

## ハンドオフ元

Claude Design (claude.ai/design) で HTML/CSS/JS プロトタイプとして作成されたものを、コード実装向けにこのリポジトリへ移植。

デザインの意図・使い方は `HANDOFF-README.md` を参照。
