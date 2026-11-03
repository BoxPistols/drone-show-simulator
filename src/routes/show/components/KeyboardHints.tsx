import { memo, useEffect, useRef } from 'react';
import { useFocusTrap } from '~/hooks/useFocusTrap';

interface Props {
  open: boolean;
  onClose: () => void;
}

const HINTS: ReadonlyArray<readonly [string, string]> = [
  ['Space', '再生 / 一時停止'],
  ['← / →', '前 / 次の演目'],
  ['1 〜 9', '演目へ直接ジャンプ'],
  ['+ / −', '再生速度を変更'],
  ['C', '視点を切替（観客 / 機体目線 / 360°）'],
  ['V', '別の機体の目線へ'],
  ['[ / ]', 'ID が前 / 次の機体の目線へ'],
  ['クリック', '点をクリック（タップ）した機体に乗る'],
  ['Shift + クリック', 'その機体を小窓に追加（最大 4、スマートフォンは 2）'],
  ['M', 'アンビエント音楽 ON / OFF'],
  ['F', '全画面表示'],
  ['T', '設定パネル表示切替'],
  ['S', 'スクリーンショット'],
  ['? / Esc', 'このヘルプを開閉'],
];

export const KeyboardHints = memo(function KeyboardHints({ open, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, open);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div
      ref={ref}
      className={'kbd-hints' + (open ? ' open' : '')}
      role="dialog"
      aria-label="キーボードショートカット"
      aria-modal="true"
      aria-hidden={!open}
    >
      <div className="kh-title">
        キー操作<span className="en">Keyboard Shortcuts</span>
      </div>
      <dl>
        {HINTS.map(([key, desc]) => (
          <div key={key} style={{ display: 'contents' }}>
            <dt>{key}</dt>
            <dd>{desc}</dd>
          </div>
        ))}
      </dl>
      <button type="button" className="kh-close" onClick={onClose}>
        ? または Esc で閉じる
      </button>
    </div>
  );
});
