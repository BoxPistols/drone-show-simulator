import { useEffect, useRef, useState } from 'react';
import {
  type BrowserKind,
  detectBrowser,
  detectPlatform,
  type PlatformKind,
  type WebglFailure,
  type WebglFailureKind,
} from '../browser';

// 日本語の文章は JSX の途中で改行すると余計な空白が入るので、1 行ずつ文字列の配列で持つ。
// { code } は chrome:// などページからリンクできない文字。選んでコピーできる形で出す
type Segment = string | { code: string };
type Line = Segment[];

const NAMES: Record<BrowserKind, string> = {
  chrome: 'Chrome',
  edge: 'Edge',
  firefox: 'Firefox',
  safari: 'Safari',
  opera: 'Opera',
  samsung: 'Samsung Internet',
  other: 'ブラウザ',
};

type Guide = { steps: Line[]; note?: Line };

const RESTART_NOTE: Line = ['オンでも出ないときは、ブラウザを完全に終了して開き直してください。'];

/** OS とブラウザの組み合わせごとの直し方。1 手順 1 行に収める */
function guideFor(browser: BrowserKind, platform: PlatformKind): Guide {
  if (platform === 'ios') {
    // iOS のブラウザはすべて中身が Safari なので、設定は端末側。サイト単位の除外は Safari だけ
    const name = browser === 'other' ? 'お使いのブラウザ' : NAMES[browser];
    return {
      steps: [
        ['「設定」→「プライバシーとセキュリティ」で「ロックダウンモード」を確認'],
        browser === 'safari'
          ? ['オンなら、アドレスバー左の「ぁあ」→「Web サイトの設定」で、このサイトだけオフ']
          : [`オンなら、ロックダウンモードの「Web ブラウズを設定」で ${name} を除外`],
        ['iOS / iPadOS を最新にして、ブラウザを開き直す'],
      ],
    };
  }

  if (platform === 'android') {
    return {
      steps: [
        ['Google Play でブラウザを、設定で Android を最新にする'],
        ['ブラウザを最近使ったアプリの一覧から閉じて、開き直す'],
        ['直らなければ、別の端末かパソコンで見る'],
      ],
    };
  }

  switch (browser) {
    case 'chrome':
      return {
        steps: [
          [{ code: 'chrome://settings/system' }, ' を開く'],
          ['「グラフィック アクセラレーションが使用可能な場合は使用する」をオン'],
          ['横に出る「再起動」を押す'],
        ],
        // Brave は UA が Chrome と同じで見分けられないので、ここで添える
        note: [
          'Brave は ',
          { code: 'brave://settings/system' },
          ' で同じ手順です。',
          ...RESTART_NOTE,
        ],
      };
    case 'edge':
      return {
        steps: [
          [{ code: 'edge://settings/system' }, ' を開く'],
          ['「グラフィック アクセラレーションが使用可能な場合は使用する」をオン'],
          ['Edge を再起動する'],
        ],
        note: RESTART_NOTE,
      };
    case 'opera':
      return {
        steps: [
          [{ code: 'opera://settings' }, ' を開き、「ハードウェア」で検索'],
          ['「ハードウェアアクセラレーションを使用する」をオン'],
          ['Opera を再起動する'],
        ],
        note: RESTART_NOTE,
      };
    case 'firefox':
      return {
        steps: [
          ['「設定」→「一般」→「パフォーマンス」を開く'],
          [
            '「推奨のパフォーマンス設定を使用する」を外し、「ハードウェアアクセラレーションを使用する」をオン',
          ],
          ['Firefox を再起動する'],
        ],
        // webgl.disabled を false に戻すのは初期状態に戻すだけ
        note: [
          'まだ出ないときは ',
          { code: 'about:config' },
          ' で ',
          { code: 'webgl.disabled' },
          ' を false に戻す',
        ],
      };
    case 'safari':
      return {
        steps: [
          [
            'ロックダウンモードがオンなら、Safari の「設定」→「Web サイト」→「ロックダウンモード」で、このサイトだけオフ',
          ],
          ['macOS を最新にして、Safari を開き直す'],
        ],
      };
    default:
      return {
        steps: [
          ['ブラウザの設定を開き、「ハードウェア」で検索'],
          ['ハードウェア（グラフィック）アクセラレーションをオン'],
          ['ブラウザを再起動する'],
        ],
        note: RESTART_NOTE,
      };
  }
}

/** 「なぜ使えないのか」の見立てを 1 文で。ブラウザが返した状態から分ける */
function causeText(kind: WebglFailureKind, platform: PlatformKind, browser: BrowserKind): string {
  const apple = platform === 'ios' || browser === 'safari';
  switch (kind) {
    case 'api-missing':
      return apple
        ? 'WebGL が止められています。多くはロックダウンモードが原因です。'
        : 'WebGL が止められています。ブラウザの設定、拡張機能、管理者の設定などが原因です。';
    case 'disabled':
      return '設定や管理者のポリシーで WebGL が止められています。会社や学校の端末なら管理者にご相談ください。';
    case 'blocked':
      return 'グラフィックの不具合のため、ブラウザが WebGL を一時的に止めています。ブラウザを完全に終了して開き直すと戻ります。';
    case 'creation-failed':
      return platform === 'desktop'
        ? 'GPU を使えない状態です。ハードウェアアクセラレーションがオフ、ドライバが対応外、リモート環境などが考えられます。'
        : '端末のグラフィック機能を使えない状態です。ブラウザや OS が古い可能性があります。';
  }
}

const SAFETY =
  'WebGL は主要なブラウザに標準で入っている機能です。有効にしても、サイトが端末のファイルやほかのタブに触れることはありません。';

// ロックダウンモードは自分で選んで使う防御機能なので、端末全体を外すようには勧めない
const SAFETY_LOCKDOWN =
  '理由があってロックダウンモードを使っている場合は、端末全体はオンのまま、このサイトだけ外してください。';

function renderLine(line: Line) {
  return line.map((seg, i) => (typeof seg === 'string' ? seg : <code key={i}>{seg.code}</code>));
}

const ICON = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

/** 立方体に斜線。「3D が使えない」 */
function CubeOffIcon() {
  return (
    <svg {...ICON} width={20} height={20}>
      <path d="M8 1.8 13.5 4.8v6.4L8 14.2 2.5 11.2V4.8Z" />
      <path d="M2.5 4.8 8 7.8l5.5-3M8 7.8v6.4" />
      <path d="M1.5 1.5l13 13" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg {...ICON}>
      <circle cx="8" cy="8" r="6.2" />
      <path d="M8 4.8v3.6M8 11h.01" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg {...ICON}>
      <path d="M10.2 2.2a3.3 3.3 0 0 0-3.9 4.4L2 10.9 3.1 14l3.1-1.1 4.3-4.3a3.3 3.3 0 0 0 4.4-3.9l-2 2-1.8-.4-.4-1.8Z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg {...ICON}>
      <path d="M8 1.6 13 3.5v4c0 3.2-2.1 5.6-5 6.9-2.9-1.3-5-3.7-5-6.9v-4Z" />
      <path d="m5.6 8 1.7 1.7 3.1-3.3" />
    </svg>
  );
}

type Props = {
  failure: WebglFailure;
  /** テスト用。省略時は navigator を見る */
  userAgent?: string;
  maxTouchPoints?: number;
};

/**
 * WebGL が使えないときの案内。原因、OS とブラウザに合わせた直し方、有効にしても安全であることを短く伝える。
 * HUD と重なるので、ネイティブの <dialog> で最前面に出す（Esc で閉じる・フォーカスも任せる）。
 */
export function WebglNotice({ failure, userAgent, maxTouchPoints }: Props) {
  const [open, setOpen] = useState(true);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!open || !el || el.open) return;
    // jsdom など showModal が無い環境では open 属性で代用する
    if (typeof el.showModal === 'function') el.showModal();
    else el.setAttribute('open', '');
    // showModal は最初のボタン（末尾の「閉じる」）にフォーカスし、長い文章が下までスクロールされてしまう。
    // ダイアログ自体にフォーカスを置き、見出しから読めるようにする
    el.focus();
    el.scrollTop = 0;
  }, [open]);

  if (!open) return null;

  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const ua = userAgent ?? nav?.userAgent ?? '';
  const browser = detectBrowser(ua);
  const platform = detectPlatform(ua, maxTouchPoints ?? nav?.maxTouchPoints ?? 0);
  const apple = platform === 'ios' || browser === 'safari';
  const guide = guideFor(browser, platform);

  return (
    <dialog
      ref={ref}
      className="webgl-notice"
      tabIndex={-1}
      aria-labelledby="webgl-notice-title"
      onClose={() => setOpen(false)}
      // 観賞ページは window の keydown でショートカット（Space で再生など）を受けている。
      // 案内を読んでいる間に背後の再生が切り替わらないよう、ダイアログ内のキーはここで止める。
      // 既定の動作（Space でのスクロール、Esc で閉じる、Tab の移動）は止めない
      onKeyDown={(e) => e.stopPropagation()}
    >
      <header className="webgl-notice-head">
        <span className="webgl-notice-badge">
          <CubeOffIcon />
        </span>
        <div>
          <h2 id="webgl-notice-title">3D 表示を利用できません</h2>
          <p className="webgl-notice-lead">
            再生の操作や演目の情報は、このままお使いいただけます。
          </p>
        </div>
      </header>

      <section className="webgl-notice-row">
        <AlertIcon />
        <div>
          <h3>原因</h3>
          <p>{causeText(failure.kind, platform, browser)}</p>
        </div>
      </section>

      <section className="webgl-notice-row">
        <WrenchIcon />
        <div>
          <h3>直し方</h3>
          <ol className="webgl-notice-steps">
            {guide.steps.map((line, i) => (
              <li key={i}>{renderLine(line)}</li>
            ))}
          </ol>
          {guide.note && <p className="webgl-notice-note">{renderLine(guide.note)}</p>}
        </div>
      </section>

      <section className="webgl-notice-row">
        <ShieldIcon />
        <div>
          <h3>有効にしても安全です</h3>
          <p>{SAFETY}</p>
          {apple && <p>{SAFETY_LOCKDOWN}</p>}
        </div>
      </section>

      <details className="webgl-notice-tech">
        <summary>技術的な情報</summary>
        <code>
          {`${failure.kind} / ${platform} / ${browser}${failure.detail ? ` / ${failure.detail}` : ''}`}
        </code>
      </details>

      <form method="dialog">
        <button type="submit" className="webgl-notice-close" onClick={() => setOpen(false)}>
          閉じる
        </button>
      </form>
    </dialog>
  );
}
