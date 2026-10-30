/**
 * 初回チャンク読込中の表示。index.html にインラインで書かれた同じ見た目の
 * マークアップ（.boot / .boot-dot）を React 側でも出し、置き換わる瞬間のちらつきを防ぐ。
 */
export function Boot() {
  return (
    <div className="boot" role="status" aria-label="読み込み中">
      <div className="boot-dot" />
    </div>
  );
}
