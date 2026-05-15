interface Props {
  page: 'show' | 'fleet' | 'choreography' | 'schedule' | '404';
}

const LABELS: Record<Props['page'], { jp: string; en: string }> = {
  show: { jp: '観賞', en: 'Show' },
  fleet: { jp: '機体', en: 'Fleet' },
  choreography: { jp: '振付', en: 'Choreography' },
  schedule: { jp: '運航', en: 'Schedule' },
  '404': { jp: '見つかりません', en: 'Not Found' },
};

/**
 * Placeholder route. Each page is implemented in its own phase
 * (P3 Show, P4 Choreography, P5 Fleet, P6 Schedule, P6 404).
 */
export function Placeholder({ page }: Props) {
  const label = LABELS[page];
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#02030a',
        color: '#e8eef6',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 32, margin: 0 }}>
          {label.jp} <span style={{ opacity: 0.5, fontSize: 14 }}>· {label.en}</span>
        </h1>
        <p style={{ opacity: 0.6, marginTop: 12 }}>
          Astra Flock SPA — Phase 1 scaffolding (page implementation pending)
        </p>
      </div>
    </main>
  );
}
