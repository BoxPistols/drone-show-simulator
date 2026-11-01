export type BrowserKind = 'chrome' | 'edge' | 'firefox' | 'safari' | 'other';

/** 案内をどのブラウザ向けに出すかを UA から決める。Edge と Chrome の UA には両方 "Chrome" が入るので Edge を先に見る */
export function detectBrowser(ua: string): BrowserKind {
  if (/Edg\//.test(ua)) return 'edge';
  if (/Firefox\/|FxiOS\//.test(ua)) return 'firefox';
  if (/Chrome\/|CriOS\//.test(ua)) return 'chrome';
  if (/Safari\//.test(ua)) return 'safari';
  return 'other';
}
