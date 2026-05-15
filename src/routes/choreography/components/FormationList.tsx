import { FORMATIONS } from '~/lib/formations';
import type { EditableFormation } from '~/types/formations';
import type { FormationId } from '~/types/formations';

interface Props {
  formations: readonly EditableFormation[];
  selectedIndex: number;
  addPickerOpen: boolean;
  onSelect: (i: number) => void;
  onMove: (i: number, dir: -1 | 1) => void;
  onAdd: (typeId: FormationId) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleAddPicker: () => void;
}

function fmt(s: number) {
  const sec = Math.max(0, Math.floor(s));
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

export function FormationList({
  formations,
  selectedIndex,
  addPickerOpen,
  onSelect,
  onMove,
  onAdd,
  onDuplicate,
  onDelete,
  onToggleAddPicker,
}: Props) {
  return (
    <div className="ch-left">
      <div className="ch-list-head">
        <span>
          Programme<span className="jp">演目</span>
        </span>
        <div className="ch-list-actions">
          <button
            type="button"
            className="ch-icon-btn"
            onClick={onDuplicate}
            title="選択中を複製"
            aria-label="複製"
          >
            ⎘
          </button>
          <button
            type="button"
            className="ch-icon-btn danger"
            onClick={onDelete}
            disabled={formations.length <= 1}
            title="選択中を削除"
            aria-label="削除"
          >
            ✕
          </button>
          <button
            type="button"
            className="ch-icon-btn primary"
            onClick={onToggleAddPicker}
            title="演目を追加"
            aria-label="追加"
            aria-expanded={addPickerOpen}
          >
            +
          </button>
        </div>
      </div>
      {addPickerOpen && (
        <div className="ch-add-picker" role="menu" aria-label="形状を選んで追加">
          <div className="cap-label">形状を選んで追加</div>
          {FORMATIONS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="menuitem"
              className="cap-item"
              onClick={() => onAdd(f.id)}
              style={{ borderLeft: `3px solid ${f.color}` }}
            >
              <span className="jp">{f.jp}</span>
              <span className="en">{f.en.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      )}
      {formations.map((f, i) => (
        <button
          key={f._uid}
          type="button"
          className={'form-item' + (i === selectedIndex ? ' active' : '')}
          onClick={() => onSelect(i)}
          aria-current={i === selectedIndex ? 'true' : undefined}
        >
          <span className="fi-num">{String(i + 1).padStart(2, '0')}</span>
          <span>
            <span className="fi-jp">{f.jp}</span>
            <span className="fi-en">{f.en}</span>
          </span>
          <span className="fi-dur">{fmt(f.dur)}</span>
          <span
            className="fi-move"
            role="presentation"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              disabled={i === 0}
              onClick={(e) => {
                e.stopPropagation();
                onMove(i, -1);
              }}
              aria-label={`${f.jp} を上へ`}
              title="上へ"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={i === formations.length - 1}
              onClick={(e) => {
                e.stopPropagation();
                onMove(i, 1);
              }}
              aria-label={`${f.jp} を下へ`}
              title="下へ"
            >
              ↓
            </button>
          </span>
        </button>
      ))}
    </div>
  );
}
