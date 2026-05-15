import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div
      style={{
        flex: 1,
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 32,
        textAlign: 'center',
        color: 'var(--text-0, #f4f6fb)',
      }}
    >
      <div>
        <p
          style={{
            fontFamily: 'Poppins, sans-serif',
            fontSize: 12,
            letterSpacing: '0.32em',
            color: 'var(--pink, #ff69b4)',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          404 — Not Found
        </p>
        <h1 style={{ fontFamily: 'Shippori Mincho, serif', fontSize: 48, margin: 0 }}>
          見つかりません
        </h1>
        <p style={{ marginTop: 18, opacity: 0.65, fontSize: 14 }}>
          指定されたページは存在しないか、移動した可能性があります。
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 28 }}>
          <Link to="/" className="ch-btn primary">
            観賞へ戻る
          </Link>
          <Link to="/fleet" className="ch-btn ghost">
            機体
          </Link>
          <Link to="/choreography" className="ch-btn ghost">
            振付
          </Link>
          <Link to="/schedule" className="ch-btn ghost">
            運航
          </Link>
        </div>
      </div>
    </div>
  );
}
