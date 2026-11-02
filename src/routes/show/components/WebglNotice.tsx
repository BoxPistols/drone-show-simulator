import { useEffect, useRef, useState } from 'react';
import {
  type BrowserKind,
  detectBrowser,
  detectPlatform,
  type PlatformKind,
  type WebglFailure,
  type WebglFailureKind,
} from '../browser';

// 日本語の文章は JSX の途中で改行すると余計な空白が入るので、段落は文字列の配列で持つ。
// { code } は chrome:// などページからリンクできない文字。選んでコピーできる形で出す
type Segment = string | { code: string };
type Paragraph = Segment[];

const NAMES: Record<BrowserKind, string> = {
  chrome: 'Chrome',
  edge: 'Edge',
  firefox: 'Firefox',
  safari: 'Safari',
  opera: 'Opera',
  samsung: 'Samsung Internet',
  other: 'ブラウザ',
};

/** iOS のロックダウンモード。サイト単位の除外は Safari だけで、ほかのブラウザはアプリ単位で外す */
function lockdownIos(browser: BrowserKind): Paragraph {
  const intro =
    'iPhone や iPad で 3D が表示されない一番多い原因は「ロックダウンモード」です。オンのときは WebGL が止まります。端末全体の状態は「設定」→「プライバシーとセキュリティ」→「ロックダウンモード」で確認できます。';
  if (browser === 'safari') {
    return [
      intro +
        'このサイトだけ対象から外す場合は、Safari でこのページを開いたまま、アドレスバー左の「ぁあ」から「Web サイトの設定」を開き、「ロックダウンモード」をオフにしてください。',
    ];
  }
  const name = browser === 'other' ? 'お使いのブラウザ' : NAMES[browser];
  return [
    intro +
      `${name} を対象から外す場合は、その「ロックダウンモード」の画面にある Web ブラウズの設定を開き、アプリの一覧で ${name} を除外してください。Safari の「ぁあ」メニューでの設定は Safari にしか効かないので、このブラウザではこちらの手順になります。`,
  ];
}

const LOCKDOWN_MAC: Paragraph = [
  'Mac で「ロックダウンモード」をオンにしている場合も WebGL は止まります。このサイトだけ対象から外す場合は、Safari の「設定」→「Web サイト」→「ロックダウンモード」で、このサイトをオフにしてください。Mac 全体の状態は「システム設定」→「プライバシーとセキュリティ」で確認できます。',
];

/** OS とブラウザの組み合わせごとの「有効にする方法」 */
function enableSteps(browser: BrowserKind, platform: PlatformKind): Paragraph[] {
  if (platform === 'ios') {
    return [
      [
        'iPhone や iPad では、Chrome や Firefox などを含むすべてのブラウザが、中身は Safari と同じ仕組みで表示しています。そのため、設定する場所はブラウザではなく端末の側になります。',
      ],
      lockdownIos(browser),
      [
        'ロックダウンモードを使っていない場合は、「設定」→「一般」→「ソフトウェアアップデート」で iOS / iPadOS を最新にし、ブラウザを一度閉じてから開き直してください。',
      ],
    ];
  }

  if (platform === 'android') {
    return [
      [
        `Android の ${NAMES[browser]} には、パソコン版のようなハードウェアアクセラレーションの切り替えはありません。Google Play でブラウザのアプリを最新にし、Android 自体のアップデートも確認してください。そのうえで、最近使ったアプリの一覧からブラウザを完全に閉じ、開き直してください。`,
      ],
      [
        '古い端末や一部のグラフィック機能では、ブラウザが安定のために WebGL を止めていることがあります。その場合は、別の端末やパソコンでご覧ください。',
      ],
    ];
  }

  switch (browser) {
    case 'chrome':
      return [
        [
          'Chrome の右上にある「︙」から「設定」を開き、左の一覧から「システム」を選んでください。その中の「グラフィック アクセラレーションが使用可能な場合は使用する」をオンにすると、すぐ横に「再起動」ボタンが出るので、それを押して Chrome を開き直します。設定画面は、アドレスバーに ',
          { code: 'chrome://settings/system' },
          ' と入力しても開けます。',
        ],
        [
          'Brave も同じ手順で、アドレスは ',
          { code: 'brave://settings/system' },
          ' です。Vivaldi など、そのほかの Chrome をもとにしたブラウザでは設定の場所が異なるので、設定画面の検索欄に「ハードウェア」と入力して探してください。',
        ],
      ];
    case 'edge':
      return [
        [
          'Edge の右上にある「…」から「設定」を開き、左の一覧から「システムとパフォーマンス」を選んでください。その中の「グラフィック アクセラレーションが使用可能な場合は使用する」をオンにして、Edge を再起動します。設定画面は、アドレスバーに ',
          { code: 'edge://settings/system' },
          ' と入力しても開けます。',
        ],
      ];
    case 'opera':
      return [
        [
          'Opera の設定を開き、上の検索欄に「ハードウェア」と入力してください。「利用可能な場合はハードウェアアクセラレーションを使用する」が見つかるので、それをオンにして Opera を再起動します。設定画面は、アドレスバーに ',
          { code: 'opera://settings' },
          ' と入力しても開けます。',
        ],
      ];
    case 'firefox':
      return [
        [
          'Firefox の右上にある「≡」から「設定」を開き、「一般」の下のほうにある「パフォーマンス」を探してください。「推奨のパフォーマンス設定を使用する」のチェックを外すと「ハードウェアアクセラレーションを使用する」が現れるので、それをオンにして Firefox を再起動します。',
        ],
        [
          'それでも表示されない場合は、アドレスバーに ',
          { code: 'about:config' },
          ' と入力し、注意の画面で「危険性を承知の上で使用する」を押してから、',
          { code: 'webgl.disabled' },
          ' を検索してください。値が true になっていたら、ダブルクリックして false に戻します。これは WebGL を止める設定で、元に戻すのは初期状態に戻すことです。',
        ],
      ];
    case 'safari':
      return [
        ['Safari では WebGL は最初から有効になっていて、オンにする設定はありません。'],
        LOCKDOWN_MAC,
        [
          'ロックダウンモードを使っていない場合は、「システム設定」→「一般」→「ソフトウェアアップデート」で macOS を最新にし、Safari を一度終了してから開き直してください。',
        ],
      ];
    default:
      return [
        [
          'ブラウザの設定にある「ハードウェアアクセラレーション」または「グラフィック アクセラレーション」をオンにして、ブラウザを再起動してください。設定画面の検索欄に「ハードウェア」と入力すると見つけやすくなります。Chrome、Edge、Firefox、Safari、Opera の最新版であれば、どれでも 3D 表示に対応しています。',
        ],
      ];
  }
}

/** 「なぜ使えないのか」の見立て。ブラウザが返した状態から分ける */
function causeText(kind: WebglFailureKind, platform: PlatformKind, browser: BrowserKind): string {
  const apple = platform === 'ios' || browser === 'safari';
  switch (kind) {
    case 'api-missing':
      return apple
        ? 'このブラウザでは WebGL の機能そのものが止められています。Apple の端末では、ほとんどの場合「ロックダウンモード」が理由です。'
        : 'このブラウザでは WebGL の機能そのものが止められています。ブラウザの設定や拡張機能、または会社や学校の管理設定で切られていることが多い原因です。';
    case 'disabled':
      return 'このブラウザでは、WebGL が設定で明示的に止められています。会社や学校で管理されているパソコンでは管理者のポリシーで、そうでなければブラウザの詳細設定や起動時のオプションで切られていることが考えられます。管理されている端末の場合、自分では変更できないことがあるので、管理者にご相談ください。';
    case 'blocked':
      return '以前にグラフィックの処理が止まったため、ブラウザが念のため、このサイトでの WebGL を一時的に止めています。ブラウザを完全に終了して起動し直すと元に戻ります。';
    case 'creation-failed':
      return platform === 'desktop'
        ? 'WebGL の機能はありますが、パソコンのグラフィック機能（GPU）を使えない状態です。ハードウェアアクセラレーションがオフになっている、グラフィックドライバがブラウザの対応外になっている、仮想環境やリモートデスクトップで見ている、などが考えられます。'
        : 'WebGL の機能はありますが、端末のグラフィック機能を使えない状態です。ブラウザや OS が古いか、端末のグラフィック機能がブラウザの対応外になっていることが考えられます。';
  }
}

const LEAD =
  'お使いのブラウザで、3D を描くための仕組み（WebGL）が使えない状態になっています。演目の情報や再生の操作は、このままお使いいただけます。';

const STILL_NOT =
  '設定がすでにオンになっている場合は、ブラウザのウィンドウをすべて閉じて、起動し直してみてください。グラフィックの不具合が続くと、ブラウザは念のため WebGL を一時的に止めることがあり、再起動すると元に戻ります。会社や学校のパソコンでは管理者の設定で止められていることもあるので、その場合は管理者にご相談ください。';

const SAFETY = [
  '安全です。WebGL は Chrome、Edge、Firefox、Safari など主要なブラウザすべてに標準で入っていて、最初から有効になっている機能です。地図サービスや商品の 3D 表示など、多くのサイトがふだんから使っています。',
  'WebGL はブラウザの中の隔離された領域（サンドボックス）で動き、ブラウザがグラフィックへの命令を確かめてから処理します。そのため、有効にしたことでサイトが端末の中のファイルやほかのタブの内容に触れられるようになることはありません。ハードウェアアクセラレーションの設定も表示を速くするためのもので、セキュリティを弱めるものではありません。',
  'なお、このページは WebGL を 3D の描画にだけ使っていて、WebGL を通じて何かを外部へ送ることはありません。',
];

const SAFETY_LOCKDOWN =
  'ただし、ロックダウンモードは、特定の人を狙った高度な攻撃から身を守るために自分で選んでオンにする機能です。オンにした理由がある場合は、端末全体のロックダウンモードは外さず、このサイトだけを対象から外すか、別の端末でご覧ください。';

function renderParagraph(p: Paragraph, key: number) {
  return (
    <p key={key}>
      {p.map((seg, i) => (typeof seg === 'string' ? seg : <code key={i}>{seg.code}</code>))}
    </p>
  );
}

type Props = {
  failure: WebglFailure;
  /** テスト用。省略時は navigator を見る */
  userAgent?: string;
  maxTouchPoints?: number;
};

/**
 * WebGL が使えないときの案内。考えられる原因、OS とブラウザに合わせた直し方、有効にしても安全であることを文章で伝える。
 * 文章が長く HUD と重なるので、ネイティブの <dialog> で最前面に出す（Esc で閉じる・フォーカスも任せる）。
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
      <h2 id="webgl-notice-title">3D 表示を利用できません</h2>
      <p>{LEAD}</p>

      <h3>考えられる原因</h3>
      <p>{causeText(failure.kind, platform, browser)}</p>

      <h3>3D 表示を有効にする方法</h3>
      {enableSteps(browser, platform).map(renderParagraph)}
      {platform === 'desktop' && browser !== 'safari' && <p>{STILL_NOT}</p>}

      <h3>有効にしても安全ですか</h3>
      {SAFETY.map((t) => (
        <p key={t}>{t}</p>
      ))}
      {apple && <p>{SAFETY_LOCKDOWN}</p>}

      <details className="webgl-notice-tech">
        <summary>技術的な情報（お問い合わせの際にお伝えください）</summary>
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
