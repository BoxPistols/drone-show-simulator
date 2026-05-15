import { PALETTES, SKIES, FORMATIONS } from '~/lib/formations';
import type { PaletteKey, SkyKey } from '~/types/formations';
import { PALETTE_KEYS, SKY_KEYS } from '~/types/formations';
import type { ShowState } from '../types';

interface Props {
  open: boolean;
  state: ShowState;
  onClose: () => void;
  onPaletteChange: (k: PaletteKey) => void;
  onSkyChange: (k: SkyKey) => void;
  onToggle: (key: 'trails' | 'rotate' | 'glow') => void;
  onSizeChange: (n: number) => void;
  onSeekFormation: (i: number) => void;
}

export function TweaksPanel({
  open,
  state,
  onClose,
  onPaletteChange,
  onSkyChange,
  onToggle,
  onSizeChange,
  onSeekFormation,
}: Props) {
  return (
    <div
      id="tweaks-panel"
      className={open ? 'open' : ''}
      role="dialog"
      aria-label="演出設定パネル"
      aria-hidden={!open}
    >
      <div className="tw-header">
        <div className="tw-title">
          Tweaks<span className="en">つまみ</span>
        </div>
        <button
          type="button"
          aria-label="閉じる"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 0,
            color: 'rgba(255,255,255,0.5)',
            fontSize: 18,
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>

      <div className="tw-section">
        <div className="tw-label">Formation ・ 演目</div>
        <div className="tw-formations">
          {FORMATIONS.map((f, i) => (
            <button
              key={f.id}
              type="button"
              className={'tw-form-btn' + (i === state.formationIndex ? ' active' : '')}
              onClick={() => onSeekFormation(i)}
            >
              {f.jp}
              <span className="en">{f.en.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="tw-section">
        <div className="tw-label">Palette ・ 色</div>
        <div className="tw-swatches">
          {PALETTE_KEYS.map((k) => {
            const p = PALETTES[k];
            return (
              <button
                key={k}
                type="button"
                className={'tw-swatch' + (state.palette === k ? ' active' : '')}
                title={`${p.jp} / ${p.name}`}
                aria-label={`パレット: ${p.jp}`}
                aria-pressed={state.palette === k}
                onClick={() => onPaletteChange(k)}
                style={{
                  background: `linear-gradient(135deg, ${p.colors[0]} 0%, ${p.colors[1]} 50%, ${p.colors[2]} 100%)`,
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="tw-section">
        <div className="tw-label">Sky ・ 空</div>
        <div className="tw-swatches">
          {SKY_KEYS.map((k) => {
            const s = SKIES[k];
            return (
              <button
                key={k}
                type="button"
                className={'tw-swatch' + (state.sky === k ? ' active' : '')}
                title={`${s.jp} / ${s.name}`}
                aria-label={`空: ${s.jp}`}
                aria-pressed={state.sky === k}
                onClick={() => onSkyChange(k)}
                style={{ background: `linear-gradient(180deg, ${s.bg[2]}, ${s.bg[0]})` }}
              />
            );
          })}
        </div>
      </div>

      <div className="tw-section">
        <div className="tw-label">Effects ・ 演出</div>
        {(['trails', 'rotate', 'glow'] as const).map((key) => {
          const labelMap = {
            trails: '光の残像 Trails',
            rotate: '自動回転 Auto-rotate',
            glow: 'グロウ Glow',
          } as const;
          return (
            <div className="tw-toggle-row" key={key}>
              <span>{labelMap[key]}</span>
              <button
                type="button"
                role="switch"
                aria-checked={state[key]}
                aria-label={labelMap[key]}
                className={'tw-toggle' + (state[key] ? ' on' : '')}
                onClick={() => onToggle(key)}
              />
            </div>
          );
        })}
      </div>

      <div className="tw-section">
        <div className="tw-label">
          Drone size <span className="tw-slider-value">{state.droneSize.toFixed(1)}×</span>
        </div>
        <input
          type="range"
          className="tw-slider"
          min={0.5}
          max={2.5}
          step={0.1}
          value={state.droneSize}
          onChange={(e) => onSizeChange(parseFloat(e.target.value))}
          aria-label="ドローンの大きさ"
        />
      </div>
    </div>
  );
}
