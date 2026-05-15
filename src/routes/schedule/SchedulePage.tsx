/**
 * Placeholder for the Schedule view. P6 will port schedule.jsx into Calendar /
 * EventDrawer / Checklist / CrewList / PreflightSummary components.
 */
export function SchedulePage() {
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
        運航スケジュール
      </h1>
      <p style={{ opacity: 0.6, marginTop: 12 }}>Schedule — implementation lands in P6</p>
    </div>
  );
}
