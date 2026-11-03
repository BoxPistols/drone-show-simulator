# 紹介動画（Remotion）

Astra Flock を紹介する約 34 秒の動画（1920×1080・30fps・音声なし）を [Remotion](https://www.remotion.dev/) で作ります。
アプリとは別のパッケージで、アプリのビルドや CI には含まれません。

## 構成

| 時間 | 内容 |
| --- | --- |
| 0:00–0:05 | 地上の 660 機が離陸して球体になり、タイトル「星群 ASTRA FLOCK」 |
| 0:05–0:18 | 演目：単螺旋 → 熊 → 立方体 → 心臓 → 銀河（演目名と説明はアプリと同じ文言） |
| 0:18–0:29 | 4 画面の紹介：観賞・振付・機体・運航（アプリの実際の画面） |
| 0:29–0:34 | 締め：銀河とタイトル、URL |

点群はアプリの `src/lib/formations.ts` の座標をそのまま読み、2D canvas に透視投影で描きます。
WebGL を使わないので、GPU の無い環境でも同じ絵で書き出せます。

## 使い方

Node 22 以上と pnpm が必要です。コマンドはすべて `video/` で実行します。

```bash
pnpm install
```

```bash
# ブラウザでプレビューしながら編集する
pnpm studio
```

```bash
# MP4 を書き出す（out/astra-flock-intro.mp4）
pnpm render
```

```bash
# サムネイル用の静止画（3 秒目）を書き出す（out/poster.png）
pnpm still
```

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

## フォントのライセンス

`public/fonts/` の Shippori Mincho・Poppins・Noto Sans JP は、いずれも SIL Open Font License 1.1 のもとで Google Fonts から配布されているものを、使う文字だけに絞って同梱しています。
