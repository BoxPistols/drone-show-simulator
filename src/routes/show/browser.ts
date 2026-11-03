export type BrowserKind = 'chrome' | 'edge' | 'firefox' | 'safari' | 'opera' | 'samsung' | 'other';
export type PlatformKind = 'ios' | 'android' | 'desktop';

/**
 * 案内をどのブラウザ向けに出すかを UA から決める。
 * Edge・Opera・Samsung Internet の UA にも "Chrome" が入るので、それらを先に見る。
 * Brave / Vivaldi などは UA が Chrome と同じなので chrome として扱う（手順も同じ）。
 */
export function detectBrowser(ua: string): BrowserKind {
  if (/Edg(e|A|iOS)?\//.test(ua)) return 'edge';
  if (/OPR\/|OPT\/|Opera\//.test(ua)) return 'opera';
  if (/SamsungBrowser\//.test(ua)) return 'samsung';
  if (/Firefox\/|FxiOS\//.test(ua)) return 'firefox';
  if (/Chrome\/|CriOS\//.test(ua)) return 'chrome';
  if (/Safari\//.test(ua)) return 'safari';
  return 'other';
}

/**
 * iPadOS の Safari は既定で Mac と同じ UA を名乗るので、タッチ点の数で見分ける。
 * iOS ではどのブラウザも中身は Safari と同じ WebKit なので、ブラウザより先に OS で手順を分ける。
 */
export function detectPlatform(ua: string, maxTouchPoints = 0): PlatformKind {
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Macintosh/.test(ua) && maxTouchPoints > 1) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

/**
 * WebGL が使えなかった理由。
 * - api-missing: WebGL の機能そのものが無い（設定・拡張機能・管理ポリシー・Apple のロックダウンモードで切られている）
 * - disabled: 機能はあるが、管理ポリシー・起動オプション・about:config などで明示的に切られている
 * - blocked: GPU の処理が落ちたあと、ブラウザがこのサイトの WebGL を一時的に止めている
 * - creation-failed: 機能はあるが GPU を使えない（ハードウェアアクセラレーションがオフ、ドライバが対応外、仮想環境など）
 */
export type WebglFailureKind = 'api-missing' | 'disabled' | 'blocked' | 'creation-failed';

export type WebglFailure = {
  kind: WebglFailureKind;
  /** ブラウザが webglcontextcreationerror で返した説明（ブラウザにより空） */
  detail: string;
};

export function diagnoseWebglFailure(apiPresent: boolean, statusMessage: string): WebglFailure {
  const detail = statusMessage.trim();
  if (!apiPresent) return { kind: 'api-missing', detail };
  // Chrome: "disabled by enterprise policy or commandline switch"
  if (/enterprise policy|commandline switch|webgl\.disabled/i.test(detail))
    return { kind: 'disabled', detail };
  // Chrome: "Web page caused context loss and was blocked"。Firefox の "blocklist" はドライバの対応外を指すので別扱い
  if (/caused context loss|was blocked/i.test(detail)) return { kind: 'blocked', detail };
  return { kind: 'creation-failed', detail };
}
