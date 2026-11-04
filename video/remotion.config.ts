import path from 'node:path';
import { Config } from '@remotion/cli/config';

// アプリの src/lib をそのまま読むので、アプリと同じ "~/" の別名を通す（コマンドは video/ で実行する）
Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: {
      ...(config.resolve?.alias ?? {}),
      '~': path.resolve(process.cwd(), '../src'),
    },
  },
}));

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setCodec('h264');
Config.setCrf(18);

// Remotion が取ってくるブラウザを使えない環境では、手元の Chromium（headless shell）を指定できる
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}
