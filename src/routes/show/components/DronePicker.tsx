import { memo, useId, useState } from 'react';
import { droneIdFromIndex, indexFromDroneId, stepDroneIndex } from '~/lib/droneId';
import { DRONE_COUNT } from '~/lib/formations';

interface Props {
  /** いま乗っている機体。未選択は -1 */
  povIndex: number;
  /** 小窓で見ている機体（利用者が選んだ順） */
  pips: readonly number[];
  /** この画面で使える小窓の数（軽量モードでは 0） */
  maxPips: number;
  /** 小窓が要求どおりに出ていない理由。無ければ null */
  pipNotice: string | null;
  onRide: (index: number) => void;
  onAddPip: (index: number) => void;
  onRemovePip: (index: number) => void;
  onPromotePip: (index: number) => void;
}

const LAST_ID = droneIdFromIndex(DRONE_COUNT - 1);
const ERROR_TEXT = `AS-001〜${LAST_ID} の ID か、1〜${String(DRONE_COUNT)} の番号を入力してください`;

/**
 * 機体を ID で指定して乗る / 小窓に足す。3D 画面の点をクリックできない人（キーボード・読み上げ）の入口も兼ねる。
 * ↑↓ キーで ID を 1 つずつ送れる。
 */
export const DronePicker = memo(function DronePicker({
  povIndex,
  pips,
  maxPips,
  pipNotice,
  onRide,
  onAddPip,
  onRemovePip,
  onPromotePip,
}: Props) {
  const id = useId();
  const inputId = `${id}-input`;
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const read = (): number | null => {
    const i = indexFromDroneId(text);
    setError(i === null ? ERROR_TEXT : null);
    return i;
  };

  const canAdd = maxPips > 0 && pips.length < maxPips;

  return (
    <div className="tw-picker">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const i = read();
          if (i !== null) onRide(i);
        }}
        noValidate
      >
        <label className="tw-picker-label" htmlFor={inputId}>
          機体を指定
        </label>
        <input
          id={inputId}
          className="tw-picker-input"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder={povIndex >= 0 ? droneIdFromIndex(povIndex) : 'AS-001'}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
            e.preventDefault();
            const from = indexFromDroneId(text) ?? povIndex;
            setText(droneIdFromIndex(stepDroneIndex(from, e.key === 'ArrowUp' ? 1 : -1)));
            setError(null);
          }}
          aria-invalid={error !== null}
          aria-describedby={error ? `${errorId} ${helpId}` : helpId}
        />
        <div className="tw-picker-actions">
          <button type="submit" className="tw-picker-btn primary">
            この機体に乗る
          </button>
          <button
            type="button"
            className="tw-picker-btn"
            disabled={!canAdd}
            onClick={() => {
              const i = read();
              if (i !== null) {
                onAddPip(i);
                setText('');
              }
            }}
          >
            小窓に追加
          </button>
        </div>
        <p id={helpId} className="tw-picker-help">
          例: AS-123 / 123。↑↓ で ID を送る。3D 画面の点をクリックしても乗れます（Shift +
          クリックで小窓に追加）
        </p>
        <p id={errorId} className="tw-picker-error" role="alert">
          {error}
        </p>
      </form>

      <div className="tw-label tw-pip-head">
        小窓 ・ PiP{' '}
        <span className="tw-slider-value">
          {pips.length} / {maxPips}
        </span>
      </div>
      {pipNotice && (
        <p className="tw-pip-notice" role="status">
          {pipNotice}
        </p>
      )}
      {pips.length === 0 ? (
        <p className="tw-picker-help">
          他の機体の目線を最大 {Math.max(maxPips, 1)} つまで同時に表示できます
        </p>
      ) : (
        <ul className="tw-pip-list" aria-label="小窓で見ている機体">
          {pips.map((i) => {
            const droneId = droneIdFromIndex(i);
            return (
              <li key={i}>
                <span className="tw-pip-id">{droneId}</span>
                <button
                  type="button"
                  className="tw-picker-btn"
                  onClick={() => onPromotePip(i)}
                  aria-label={`${droneId} をメインの視点にする`}
                >
                  メインに
                </button>
                <button
                  type="button"
                  className="tw-picker-btn icon"
                  onClick={() => onRemovePip(i)}
                  aria-label={`${droneId} の小窓を閉じる`}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});
