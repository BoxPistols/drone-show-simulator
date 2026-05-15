/**
 * Placeholder for the immersive Show page. P3 will mount the Three.js scene
 * (useDroneShow hook) plus the programme bar, transport, tweaks panel,
 * keyboard hints, and now-playing card.
 */
export function ShowPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#02030a',
        color: '#e8eef6',
      }}
    >
      <div style={{ textAlign: 'center', padding: 24 }}>
        <h1 style={{ fontFamily: 'Shippori Mincho, serif', fontSize: 42, margin: 0 }}>観賞</h1>
        <p style={{ opacity: 0.6, marginTop: 12 }}>Show page — Three.js scene lands in P3</p>
      </div>
    </div>
  );
}
