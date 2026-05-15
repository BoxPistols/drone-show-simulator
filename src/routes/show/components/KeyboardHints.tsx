import { useEffect, useRef } from 'react';
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
  ['F', '全画面表示'],
  ['T', '設定パネル表示切替'],
  ['S', 'スクリーンショット'],
  ['? / Esc', 'このヘルプを開閉'],
];

export function KeyboardHints({ open, onClose }: Props) {
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
      <button
        type="button"
        className="kh-close"
        onClick={onClose}
        style={{ background: 'transparent', border: 0, cursor: 'pointer', width: '100%' }}
      >
        ? または Esc で閉じる
      </button>
    </div>
  );
}
