# 紹介動画（Remotion）

Astra Flock を紹介する 36 秒の動画を [Remotion](https://www.remotion.dev/) で作ります。音楽付きで、2 本あります。

| コンポジション | 大きさ | 用途 |
| --- | --- | --- |
| `Intro` | 1920×1080（横長） | YouTube、サイト、README |
| `IntroVertical` | 1080×1920（縦長） | Instagram リール、TikTok、YouTube ショート |

アプリとは別のパッケージで、アプリのビルドや CI には含まれません。

## 構成

| 時間 | 内容 |
| --- | --- |
| 0:00–0:05 | 地上の 660 機が離陸して球体になり、タイトル「星群 ASTRA FLOCK」 |
| 0:05–0:18 | 演目：単螺旋 → 熊 → 立方体 → 心臓 → 銀河（演目名と説明はアプリと同じ文言） |
| 0:18–0:31 | 5 つの画面：観賞・機体目線・振付・機体・運航（アプリの実際の画面） |
| 0:31–0:36 | 締め：銀河とタイトル、URL |

時間割は `src/timeline.ts` にまとめてあり、映像と音楽の両方がここを読みます。
寸法の違い（横長と縦長）は `src/layout.ts` にまとめ、シーンの中身は共通です。

点群はアプリの `src/lib/formations.ts` の座標をそのまま読み、2D canvas に透視投影で描きます。
WebGL を使わないので、GPU の無い環境でも同じ絵で書き出せます。

## 音楽

`scripts/music.ts` が `public/music.wav` を合成します。アプリのアンビエント音楽（`src/routes/show/audio/`）と同じ作りで、和音と音階はアプリの `scale.ts` をそのまま使います。

- パッド：和音 5 声 × 2 を、ゆっくり開閉するローパスに通す。演目や画面が変わると和音が滑らかに移る
- 鈴：演目や画面が切り替わる瞬間に、和音の上で短い分散和音
- 画面紹介：テンポ 96 の八分で和音の音を軽く爪弾く
- 風と、左右で長さの違うディレイ

乱数の種を固定しているので、何度実行しても同じ音になります。音源ファイルはリポジトリに入れず、`pnpm render` と `pnpm studio` の前に自動で作ります。権利の確認が要る素材は使っていません。

## 使い方

Node 22.18 以上と pnpm が必要です（音楽の生成スクリプトを TypeScript のまま実行するため）。コマンドはすべて `video/` で実行します。

```bash
pnpm install
```

```bash
# ブラウザでプレビューしながら編集する
pnpm studio
```

```bash
# 横長と縦長の MP4 を書き出す（out/astra-flock-intro.mp4、out/astra-flock-intro-vertical.mp4）
pnpm render
```

```bash
# サムネイル用の静止画（3 秒目）を書き出す（out/poster.png、out/poster-vertical.png）
pnpm still
```

Remotion は初回にブラウザ（Chrome Headless Shell）を自動で取ってきます。取ってこられない環境では、手元のものを `REMOTION_BROWSER_EXECUTABLE` で指定できます。

### 素材を作り直す

- **アプリの画面**（`public/*.jpg`）：アプリの見た目を変えたら撮り直します。親ディレクトリで `pnpm install` 済みであること。
  ```bash
  pnpm capture
  ```
  Playwright のブラウザが入っていない環境では、`CHROMIUM_PATH` で手元の Chromium を指定できます。
- **フォント**（`public/fonts/*.woff2`）：動画やアプリの演目の文言を変えたら作り直します。
  使っている文字だけを含む小さなフォントを Google Fonts から取ってきます。
  ```bash
  pnpm fonts
  ```
  プロキシ越しの環境では `NODE_USE_ENV_PROXY=1 pnpm fonts` で実行します。

書き出しはネットワークに頼らず、`public/` のファイルだけを読みます。

## ライセンス

- Remotion には独自のライセンスがあり、従業員 4 人以上の会社で使う場合は有償のライセンスが必要です（[Remotion のライセンス](https://www.remotion.dev/license)）。
- `public/fonts/` の Shippori Mincho・Poppins・Noto Sans JP は、いずれも SIL Open Font License 1.1 のもとで Google Fonts から配布されているものを、使う文字だけに絞って同梱しています。
