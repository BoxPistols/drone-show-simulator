import { FLEET, PALETTES } from '~/lib/formations';
import type { EditableFormation, EasingName } from '~/types/formations';
import { PALETTE_KEYS } from '~/types/formations';
import { ease } from '~/lib/easing';
import { EasingCurves } from './EasingCurves';

interface Props {
  formation: EditableFormation;
  index: number;
  time: number;
  totalTime: number;
  onPatch: (patch: Partial<EditableFormation>) => void;
}

function fmtEaseLive(time: number, total: number, easingName: EasingName): string {
  if (!total) return '';
  const t = (time % total) / total;
  const v = ease(easingName, t);
  return `t=${t.toFixed(2)} → ${v.toFixed(2)}`;
}

export function Inspector({ formation, index, time, totalTime, onPatch }: Props) {
  const fleetTotal = FLEET.total;
  const fleetAvailable = FLEET.available;
  const fleetMaint = FLEET.maint;
  const fleetOther = FLEET.reservable;
  const overAvailable = formation.drones > fleetAvailable;

  return (
    <aside className="ch-right" aria-label="演目インスペクター">
      <h2 className="cr-title">
        <span className="num">{String(index + 1).padStart(2, '0')}</span>
        {formation.jp}
      </h2>
      <div className="cr-sub">{formation.en}</div>

      <section className="cr-section">
        <header className="cr-sec-head">
          <span>Description</span>
          <span className="jp">説明</span>
        </header>
        <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-2)', margin: 0 }}>
          {formation.desc}
        </p>
      </section>

      <section className="cr-section">
        <header className="cr-sec-head">
          <span>Parameters</span>
          <span className="jp">パラメータ</span>
        </header>
        <div className="cr-field">
          <label className="cr-label">
            継続時間 Duration<span className="val">{formation.dur}s</span>
          </label>
          <input
            type="range"
            className="cr-slider"
            min={10}
            max={90}
            value={formation.dur}
            onChange={(e) => onPatch({ dur: +e.target.value })}
            aria-label="継続時間 (秒)"
          />
        </div>
        <div className="cr-field">
          <label className="cr-label">
            高度 Altitude<span className="val">{formation.altitude}m</span>
          </label>
          <input
            type="range"
            className="cr-slider"
            min={30}
            max={150}
            value={formation.altitude}
            onChange={(e) => onPatch({ altitude: +e.target.value })}
            aria-label="高度 (メートル)"
          />
        </div>
        <div className="cr-field">
          <label className="cr-label">
            広がり Spread<span className="val">{formation.spread}m</span>
          </label>
          <input
            type="range"
            className="cr-slider"
            min={20}
            max={120}
            value={formation.spread}
            onChange={(e) => onPatch({ spread: +e.target.value })}
            aria-label="広がり (メートル)"
          />
        </div>
        <div className="cr-field">
          <label className="cr-label">
            遷移速度 Transition<span className="val">{formation.speed.toFixed(1)}×</span>
          </label>
          <input
            type="range"
            className="cr-slider"
            min={0.3}
            max={2.5}
            step={0.1}
            value={formation.speed}
            onChange={(e) => onPatch({ speed: +e.target.value })}
            aria-label="遷移速度 (倍率)"
          />
        </div>
      </section>

      <section className="cr-section">
        <header className="cr-sec-head">
          <span>Easing</span>
          <span className="jp">
            補間曲線 ・{' '}
            <b style={{ color: 'var(--moon)' }}>{fmtEaseLive(time, totalTime, formation.easing)}</b>
          </span>
        </header>
        <EasingCurves selected={formation.easing} onChange={(easing) => onPatch({ easing })} />
      </section>

      <section className="cr-section">
        <header className="cr-sec-head">
          <span>Palette Override</span>
          <span className="jp">色指定</span>
        </header>
        <div className="cr-swatches">
          <button
            type="button"
            className={'cr-sw' + (formation.paletteOverride === null ? ' on' : '')}
            style={{
              background:
                'repeating-linear-gradient(45deg, rgba(255,255,255,0.15) 0 3px, transparent 3px 6px)',
            }}
            title="Inherit"
            aria-label="パレット継承"
            aria-pressed={formation.paletteOverride === null}
            onClick={() => onPatch({ paletteOverride: null })}
          />
          {PALETTE_KEYS.map((k) => {
            const p = PALETTES[k];
            const active = formation.paletteOverride === k;
            return (
              <button
                key={k}
                type="button"
                className={'cr-sw' + (active ? ' on' : '')}
                style={{
                  background: `linear-gradient(135deg, ${p.colors[0]}, ${p.colors[1]} 50%, ${p.colors[2]})`,
                }}
                title={p.jp}
                aria-label={`パレット: ${p.jp}`}
                aria-pressed={active}
                onClick={() => onPatch({ paletteOverride: k })}
              />
            );
          })}
        </div>
      </section>

      <section className="cr-section">
        <header className="cr-sec-head">
          <span>Drone Allocation</span>
          <span className="jp">機体配分</span>
        </header>
        <div className="cr-dronecount">
          <span className="l">配置機数</span>
          <span className="v" style={{ color: overAvailable ? 'var(--warn)' : 'var(--text-0)' }}>
            {formation.drones} / {fleetTotal} 機
          </span>
        </div>
        <input
          type="range"
          className="cr-slider"
          min={60}
          max={fleetTotal}
          step={10}
          value={formation.drones}
          onChange={(e) => onPatch({ drones: +e.target.value })}
          style={{ marginTop: 8 }}
          aria-label="配置する機体数"
        />

        <div className="cr-fleet">
          <div className="cr-fleet-row">
            <span className="l">稼働可能 Active</span>
            <span className="v ok">{fleetAvailable}</span>
          </div>
          <div className="cr-fleet-row">
            <span className="l">充電 / 待機</span>
            <span className="v muted">{fleetOther}</span>
          </div>
          <div className="cr-fleet-row">
            <span className="l">整備中 Maintenance</span>
            <span className="v err">{fleetMaint}</span>
          </div>
          {overAvailable && (
            <div className="cr-warning" role="alert">
              ⚠ 配分 ({formation.drones}) が即時稼働可能数 ({fleetAvailable}) を超過。
              {formation.drones - fleetAvailable} 機は充電/待機から招集が必要。
            </div>
          )}
        </div>

        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--text-3)',
            marginTop: 10,
            lineHeight: 1.7,
            letterSpacing: '0.04em',
          }}
        >
          AS-001 … AS-{String(formation.drones).padStart(3, '0')} ・{' '}
          {formation.drones === fleetTotal ? '全機割当' : `${formation.drones}機割当`}
          <br />
          予備機: AS-{String(formation.drones + 1).padStart(3, '0')}以降{' '}
          {fleetTotal - formation.drones}機
        </div>
      </section>
    </aside>
  );
}
