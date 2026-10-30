import { memo } from 'react';
import { PALETTES, SKIES, FORMATIONS } from '~/lib/formations';
import type { PaletteKey, SkyKey } from '~/types/formations';
import { PALETTE_KEYS, SKY_KEYS } from '~/types/formations';
import { CAMERA_META } from '../pov';
import { CAMERA_MODES, type CameraMode, type ShowPrefs, type ToggleKey } from '../types';

interface Props {
  open: boolean;
  prefs: ShowPrefs;
  formationIndex: number;
  /** 機体目線で乗っている機体（0 始まり）。未選択は -1 */
  povIndex: number;
  onClose: () => void;
  onPaletteChange: (k: PaletteKey) => void;
  onSkyChange: (k: SkyKey) => void;
  onToggle: (key: ToggleKey) => void;
  onSizeChange: (n: number) => void;
  onSeekFormation: (i: number) => void;
  onCameraChange: (mode: CameraMode) => void;
  onNextPov: () => void;
  onVolumeChange: (v: number) => void;
}

const TOGGLES: ReadonlyArray<{ key: ToggleKey; label: string; hint?: string }> = [
  { key: 'lite', label: '軽量モード Lite', hint: '解像度を抑え、残像と星を減らします' },
  { key: 'trails', label: '光の残像 Trails' },
  { key: 'rotate', label: '自動回転 Auto-rotate' },
  { key: 'glow', label: 'グロウ Glow' },
];

/**
 * 演出設定パネル。props が変わらない限り再描画しない（HUD の更新ごとに描き直さないため memo）。
 * 閉じているときも DOM は残す（開閉のたびに作り直さない／E2E が #tweaks-panel を参照する）。
 */
export const TweaksPanel = memo(function TweaksPanel({
  open,
  prefs,
  formationIndex,
  povIndex,
  onClose,
  onPaletteChange,
  onSkyChange,
  onToggle,
  onSizeChange,
  onSeekFormation,
  onCameraChange,
  onNextPov,
  onVolumeChange,
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
        <button type="button" className="tw-close" aria-label="閉じる" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="tw-section">
        <div className="tw-label">Camera ・ 視点</div>
        <div className="tw-cameras" role="radiogroup" aria-label="視点">
          {CAMERA_MODES.map((mode) => {
            const m = CAMERA_META[mode];
            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={prefs.camera === mode}
                className={'tw-form-btn' + (prefs.camera === mode ? ' active' : '')}
                onClick={() => onCameraChange(mode)}
              >
                {m.jp}
                <span className="en">{m.en}</span>
              </button>
            );
          })}
        </div>
        <div className="tw-cam-desc">{CAMERA_META[prefs.camera].desc}</div>
        {prefs.camera === 'drone' && (
          <button type="button" className="tw-next" onClick={onNextPov}>
            別の機体へ{povIndex >= 0 && ` ・ 今は AS-${String(povIndex + 1).padStart(3, '0')}`}
          </button>
        )}
      </div>

      <div className="tw-section">
        <div className="tw-label">Sound ・ 音</div>
        <div className="tw-toggle-row">
          <span>
            アンビエント音楽 Music
            <small className="tw-hint">端末で生成する環境音。演目ごとに和音が移ります</small>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.music}
            aria-label="アンビエント音楽"
            className={'tw-toggle' + (prefs.music ? ' on' : '')}
            onClick={() => onToggle('music')}
          />
        </div>
        <div className="tw-label" style={{ marginTop: 6 }}>
          Volume <span className="tw-slider-value">{Math.round(prefs.volume * 100)}%</span>
        </div>
        <input
          type="range"
          className="tw-slider"
          min={0}
          max={1}
          step={0.05}
          value={prefs.volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          aria-label="音量"
        />
      </div>

      <div className="tw-section">
        <div className="tw-label">Formation ・ 演目</div>
        <div className="tw-formations">
          {FORMATIONS.map((f, i) => (
            <button
              key={f.id}
              type="button"
              className={'tw-form-btn' + (i === formationIndex ? ' active' : '')}
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
                className={'tw-swatch' + (prefs.palette === k ? ' active' : '')}
                title={`${p.jp} / ${p.name}`}
                aria-label={`パレット: ${p.jp}`}
                aria-pressed={prefs.palette === k}
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
                className={'tw-swatch' + (prefs.sky === k ? ' active' : '')}
                title={`${s.jp} / ${s.name}`}
                aria-label={`空: ${s.jp}`}
                aria-pressed={prefs.sky === k}
                onClick={() => onSkyChange(k)}
                style={{ background: `linear-gradient(180deg, ${s.bg[2]}, ${s.bg[0]})` }}
              />
            );
          })}
        </div>
      </div>

      <div className="tw-section">
        <div className="tw-label">Effects ・ 演出</div>
        {TOGGLES.map(({ key, label, hint }) => (
          <div className="tw-toggle-row" key={key}>
            <span>
              {label}
              {hint && <small className="tw-hint">{hint}</small>}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[key]}
              aria-label={label}
              className={'tw-toggle' + (prefs[key] ? ' on' : '')}
              onClick={() => onToggle(key)}
            />
          </div>
        ))}
      </div>

      <div className="tw-section">
        <div className="tw-label">
          Drone size <span className="tw-slider-value">{prefs.droneSize.toFixed(1)}×</span>
        </div>
        <input
          type="range"
          className="tw-slider"
          min={0.5}
          max={2.5}
          step={0.1}
          value={prefs.droneSize}
          onChange={(e) => onSizeChange(parseFloat(e.target.value))}
          aria-label="ドローンの大きさ"
        />
      </div>
    </div>
  );
});
