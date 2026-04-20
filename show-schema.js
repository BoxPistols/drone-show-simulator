// ==========================================================
// Astra Flock — show schema normalize/validate (shared)
// ==========================================================
// choreography.jsx の JSON import ロジックを切り出し、テスト可能にしたもの。
// window.AstraFlockSchema として公開、Node の vm sandbox でも同じ関数を
// 呼び出せる (test/show-schema.test.mjs が検証)。
(function () {
  // 受け入れる 3 format:
  //   (A) 配列: 旧形式、formations そのまま
  //   (B) v1 オブジェクト: { schema, formations, meta: {bpm}, audio }
  //   (C) preset: { savedAt, formations } (named-presets の single)
  // 戻り値: { ok, formations, bpm, audio, fallbackCount, warning }
  function normalizeShow(data, knownIds) {
    if (data == null) return { ok: false, error: 'null or undefined data' };
    const knownIdSet = new Set(knownIds || []);

    let formationsArr;
    let bpm = null;
    let audio = null;
    if (Array.isArray(data)) {
      formationsArr = data;
    } else if (data.formations && Array.isArray(data.formations)) {
      formationsArr = data.formations;
      if (typeof data.meta?.bpm === 'number') bpm = data.meta.bpm;
      if (data.audio?.name) audio = { name: data.audio.name, duration: data.audio.duration || null };
    } else {
      return { ok: false, error: '認識できるフォーマットではありません' };
    }
    if (formationsArr.length === 0) {
      return { ok: false, error: '演目が空' };
    }

    let fallbackCount = 0;
    const formations = formationsArr.map((f, i) => {
      if (!f || !f.id) {
        throw new Error(`演目 #${i + 1} に id がありません`);
      }
      const rawType = f.typeId || f.id;
      const typeId = knownIdSet.size === 0 || knownIdSet.has(rawType) ? rawType : 'sphere';
      if (typeId !== rawType) fallbackCount++;
      return {
        ...f,
        typeId,
        easing: f.easing || 'Ease-both',
        paletteOverride: f.paletteOverride ?? null,
        altitude: typeof f.altitude === 'number' ? f.altitude : 60,
        spread: typeof f.spread === 'number' ? f.spread : 55,
        speed: typeof f.speed === 'number' ? f.speed : 1.0,
        drones: typeof f.drones === 'number' ? f.drones : 660,
        dur: typeof f.dur === 'number' ? f.dur : 30,
        jp: f.jp || '新規',
        en: f.en || 'New',
        color: f.color || '#6ed3e6',
        desc: f.desc || '',
      };
    });

    // clamp bpm (UI input range 30-300)
    if (bpm !== null) bpm = Math.max(30, Math.min(300, bpm));

    return { ok: true, formations, bpm, audio, fallbackCount };
  }

  if (typeof window !== 'undefined') {
    window.AstraFlockSchema = { normalizeShow };
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { normalizeShow };
  }
})();
