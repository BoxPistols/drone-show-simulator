import { useState } from 'react';
import { Modal } from '~/components/ui/Modal';
import type { EditableFormation } from '~/types/formations';

export interface Preset {
  savedAt: number;
  formations: EditableFormation[];
}

interface Props {
  open: boolean;
  presets: Record<string, Preset>;
  onClose: () => void;
  onSave: (name: string) => void;
  onLoad: (name: string) => void;
  onDelete: (name: string) => void;
}

export function PresetModal({ open, presets, onClose, onSave, onLoad, onDelete }: Props) {
  const [name, setName] = useState('');
  const sorted = Object.entries(presets).sort((a, b) => b[1].savedAt - a[1].savedAt);

  return (
    <Modal open={open} onClose={onClose} label="プリセット管理">
      <div className="pm-header">
        <h2 className="pm-title">
          プリセット<span className="en">Presets</span>
        </h2>
        <button type="button" className="pm-close" onClick={onClose} aria-label="閉じる">
          ×
        </button>
      </div>
      <div className="pm-save">
        <input
          type="text"
          className="pm-input"
          placeholder="プリセット名を入力..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) {
              onSave(name.trim());
              setName('');
            }
          }}
          aria-label="プリセット名"
        />
        <button
          type="button"
          className="pm-btn primary"
          onClick={() => {
            if (!name.trim()) return;
            onSave(name.trim());
            setName('');
          }}
          disabled={!name.trim()}
        >
          現在を保存
        </button>
      </div>
      <div className="pm-list">
        {sorted.length === 0 ? (
          <div className="pm-empty">まだ保存されたプリセットはありません</div>
        ) : (
          sorted.map(([key, p]) => (
            <div key={key} className="pm-item">
              <div className="pm-item-info">
                <div className="pm-name">{key}</div>
                <div className="pm-meta">
                  {p.formations.length} 演目 ・{' '}
                  {new Date(p.savedAt).toLocaleString('ja-JP', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
              <div className="pm-actions">
                <button type="button" className="pm-btn" onClick={() => onLoad(key)}>
                  読込
                </button>
                <button
                  type="button"
                  className="pm-btn danger"
                  onClick={() => onDelete(key)}
                  aria-label={`${key} を削除`}
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
