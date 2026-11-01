import { useEffect, useRef, useState } from 'react';
import { type BrowserKind, detectBrowser } from '../browser';

// 日本語の文章は JSX の途中で改行すると余計な空白が入るので、段落ごとに 1 つの文字列で持つ

/** ブラウザごとの「有効にする方法」。chrome:// などはページからリンクできないので、選んでコピーできる文字で出す */
const STEPS: Record<BrowserKind, { text: string; url?: string; after?: string }> = {
  chrome: {
    text: 'Chrome の右上にある「︙」から「設定」を開き、左の一覧から「システム」を選んでください。その中の「グラフィック アクセラレーションが使用可能な場合は使用する」をオンにすると、すぐ横に「再起動」ボタンが出るので、それを押して Chrome を開き直します。設定画面は、アドレスバーに ',
    url: 'chrome://settings/system',
    after: ' と入力しても開けます。',
  },
  edge: {
    text: 'Edge の右上にある「…」から「設定」を開き、左の一覧から「システムとパフォーマンス」を選んでください。その中の「グラフィック アクセラレーションが使用可能な場合は使用する」をオンにして、Edge を再起動します。設定画面は、アドレスバーに ',
    url: 'edge://settings/system',
    after: ' と入力しても開けます。',
  },
  firefox: {
    text: 'Firefox の右上にある「≡」から「設定」を開き、「一般」の下のほうにある「パフォーマンス」を探してください。「推奨のパフォーマンス設定を使用する」のチェックを外すと「ハードウェアアクセラレーションを使用する」が現れるので、それをオンにして Firefox を再起動します。',
  },
  safari: {
    text: 'Safari では WebGL は最初から有効になっています。表示されない場合は、macOS や iOS のアップデートが残っていないかを確認し、最新にしてからもう一度開いてください。',
  },
  other: {
    text: 'ブラウザの設定にある「ハードウェアアクセラレーション」または「グラフィック アクセラレーション」をオンにして、ブラウザを再起動してください。Chrome、Edge、Firefox、Safari の最新版であれば、どれでも 3D 表示に対応しています。',
  },
};

const LEAD =
  'お使いのブラウザで、3D を描くための仕組み（WebGL）が使えない状態になっています。演目の情報や再生の操作は、このままお使いいただけます。';

const STILL_NOT =
  '設定がすでにオンになっている場合は、ブラウザのウィンドウをすべて閉じて、起動し直してみてください。グラフィックの不具合が続くと、ブラウザは念のため WebGL を一時的に止めることがあり、再起動すると元に戻ります。会社や学校のパソコンでは管理者の設定で止められていることもあるので、その場合は管理者にご相談ください。';

const SAFETY = [
  '安全です。WebGL は Chrome、Edge、Firefox、Safari のすべてに標準で入っていて、最初から有効になっている機能です。地図サービスや商品の 3D 表示など、多くのサイトがふだんから使っています。',
  'WebGL はブラウザの中の隔離された領域（サンドボックス）で動き、ブラウザがグラフィックへの命令を確かめてから処理します。そのため、有効にしたことでサイトがパソコンの中のファイルやほかのタブの内容に触れられるようになることはありません。上で案内した設定も表示を速くするためのもので、セキュリティを弱めるものではありません。',
  'なお、このページは WebGL を 3D の描画にだけ使っていて、WebGL を通じて何かを外部へ送ることはありません。',
];

type Props = {
  /** テスト用。省略時は navigator.userAgent を見る */
  userAgent?: string;
};

/**
 * WebGL が使えないときの案内。直し方と、有効にしても安全であることを文章で伝える。
 * 文章が長く HUD と重なるので、ネイティブの <dialog> で最前面に出す（Esc で閉じる・フォーカスも任せる）。
 */
export function WebglNotice({ userAgent }: Props) {
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

  const browser = detectBrowser(
    userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '')
  );
  const steps = STEPS[browser];

  return (
    <dialog
      ref={ref}
      className="webgl-notice"
      tabIndex={-1}
      aria-labelledby="webgl-notice-title"
      onClose={() => setOpen(false)}
    >
      <h2 id="webgl-notice-title">3D 表示を利用できません</h2>
      <p>{LEAD}</p>

      <h3>3D 表示を有効にする方法</h3>
      <p>
        {steps.text}
        {steps.url && <code>{steps.url}</code>}
        {steps.after}
      </p>
      <p>{STILL_NOT}</p>

      <h3>有効にしても安全ですか</h3>
      {SAFETY.map((t) => (
        <p key={t}>{t}</p>
      ))}

      <form method="dialog">
        <button type="submit" className="webgl-notice-close" onClick={() => setOpen(false)}>
          閉じる
        </button>
      </form>
    </dialog>
  );
}
