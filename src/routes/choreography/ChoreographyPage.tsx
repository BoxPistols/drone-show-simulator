/**
 * Placeholder for the Choreography editor. P4 (the largest phase) will port
 * choreography.jsx into Inspector / FormationList / Timeline / Preview /
 * PresetModal / EasingCurve / WaveformBar components plus useUndo / useDirty /
 * useAudio hooks.
 */
export function ChoreographyPage() {
  return (
    <div style={{ flex: 1, padding: 32, color: 'var(--text-1, rgba(255,255,255,0.78))' }}>
      <h1
        style={{
          fontFamily: 'Shippori Mincho, serif',
          fontSize: 26,
          margin: 0,
          letterSpacing: '0.08em',
        }}
      >
        振付エディタ
      </h1>
      <p style={{ opacity: 0.6, marginTop: 12 }}>Choreography — implementation lands in P4</p>
    </div>
  );
}
