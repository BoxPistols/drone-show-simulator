import { memo } from 'react';
import { droneIdFromIndex } from '~/lib/droneId';
import type { DroneCoord, PipView } from '../types';

interface Props {
  /** 実際に描いている小窓（上限・配置・負荷の判定後） */
  views: readonly PipView[];
  coords: readonly DroneCoord[];
  onPromote: (index: number) => void;
  onRemove: (index: number) => void;
}

function fmtCoord(c: DroneCoord | undefined): string {
  if (!c) return '位置を取得中';
  return `x ${c.x.toFixed(1)} y ${c.y.toFixed(1)} z ${c.z.toFixed(1)} m`;
}

/**
 * 小窓の枠と操作。映像そのものは useDroneShow が同じ canvas の同じ位置に描くので、ここは透明な枠と文字だけ。
 * canvas の中身は読み上げられないため、機体 ID と座標を文字でも出す（座標は約 5 回/秒の更新で、読み上げの
 * うるささを避けて aria-live にはしない）。
 */
export const PipViews = memo(function PipViews({ views, coords, onPromote, onRemove }: Props) {
  if (views.length === 0) return null;
  return (
    <section className="pip-layer" aria-label="小窓（他の機体の目線）">
      {views.map((v, k) => {
        const id = droneIdFromIndex(v.index);
        const descId = `pip-desc-${String(v.index)}`;
        return (
          <div
            key={v.index}
            className="pip-frame"
            style={{ left: v.rect.x, top: v.rect.y, width: v.rect.w, height: v.rect.h }}
          >
            <button
              type="button"
              className="pip-main"
              onClick={() => onPromote(v.index)}
              aria-label={`小窓 ${String(k + 1)}: ${id} の目線。押すとメインの視点にする`}
              aria-describedby={descId}
            >
              <span className="pip-id">{id}</span>
              <span className="pip-coords" id={descId}>
                {fmtCoord(coords.find((c) => c.index === v.index))}
              </span>
            </button>
            <button
              type="button"
              className="pip-close"
              onClick={() => onRemove(v.index)}
              aria-label={`${id} の小窓を閉じる`}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        );
      })}
    </section>
  );
});
