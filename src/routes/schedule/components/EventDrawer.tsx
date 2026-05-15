import { useState } from 'react';
import {
  CHECKLIST,
  CREW,
  DOW_JP,
  TYPE_META,
  type ChecklistItem,
  type ScheduleEvent,
} from '~/data/schedule';

interface Props {
  date: string;
  event: ScheduleEvent | undefined;
  onAddEvent: () => void;
}

interface PreflightItem {
  label: string;
  value: string;
  ok: boolean;
}

function buildPreflight(date: string, event: ScheduleEvent): PreflightItem[] {
  const now = new Date('2026-04-19T00:00:00+09:00');
  const target = new Date(`${date}T${event.time || '19:00'}:00+09:00`);
  const diffMs = target.getTime() - now.getTime();
  const hours = Math.round(diffMs / 3_600_000);
  const days = Math.floor(hours / 24);
  const hRemain = hours - days * 24;
  const fleetReady = 600;
  const fleetTotal = 660;
  const audioSynced = !!event.weather;
  const weather = event.weather;
  const weatherOK = weather ? weather.wind < 5 && weather.visibility === '良好' : false;
  return [
    {
      label: 'カウントダウン',
      value: diffMs > 0 ? `H-${String(days)}d ${String(hRemain)}h` : '公演済',
      ok: diffMs > 0,
    },
    {
      label: '機体稼働',
      value: `${String(fleetReady)} / ${String(fleetTotal)} 機`,
      ok: fleetReady >= 600,
    },
    {
      label: '気象条件',
      value: weather ? (weatherOK ? '良好' : '要確認') : '未取得',
      ok: weatherOK,
    },
    { label: '音響同期', value: audioSynced ? '確認済' : '未確認', ok: audioSynced },
  ];
}

export function EventDrawer({ date, event, onAddEvent }: Props) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(CHECKLIST.map((c) => ({ ...c })));
  const toggleCheck = (i: number) => {
    setChecklist((c) =>
      c.map((ci, idx) => (idx === i ? { ...ci, done: !ci.done, warn: false } : ci))
    );
  };

  const day = parseInt(date.slice(-2), 10);
  const dow = DOW_JP[new Date(date).getDay()] ?? '日';

  if (!event) {
    return (
      <aside className="sc-drawer" aria-label={`${date} のイベント`}>
        <div className="dr-date">4月{day}日</div>
        <div className="dr-sub">{date} · 予定なし</div>
        <div
          style={{
            marginTop: 40,
            padding: '40px 20px',
            textAlign: 'center',
            border: '1px dashed var(--hair)',
            borderRadius: 10,
            color: 'var(--text-3)',
            fontSize: 13,
            lineHeight: 1.8,
          }}
        >
          <div style={{ fontSize: 32, opacity: 0.3, marginBottom: 10 }}>○</div>
          この日は運航予定がありません
          <br />
          <span
            style={{
              fontFamily: 'Poppins, sans-serif',
              fontSize: 10,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--text-3)',
            }}
          >
            No events scheduled
          </span>
        </div>
        <button
          type="button"
          className="sc-btn primary"
          style={{ marginTop: 20, width: '100%' }}
          onClick={onAddEvent}
        >
          + この日に公演を追加
        </button>
      </aside>
    );
  }

  const preflight = buildPreflight(date, event);

  return (
    <aside className="sc-drawer" aria-label={`${date} のイベント詳細`}>
      <div className="dr-date">
        4月{day}日<span className="dow">{dow}曜日</span>
      </div>
      <div className="dr-sub">
        {date} · {TYPE_META[event.type].jp}
      </div>

      <div className="ev-card">
        <div className="ev-time">
          {event.time}
          {event.duration ? ` — ${String(event.duration)}分` : ''}
        </div>
        <div className="ev-title">{event.title}</div>
        <div className="ev-venue">📍 {event.venue}</div>
        <div className="ev-meta">
          {event.drones && (
            <span>
              Drones<b>{event.drones}</b>
            </span>
          )}
          {event.audience && (
            <span>
              観客<b>{(event.audience / 10000).toFixed(1)}万</b>
            </span>
          )}
        </div>
      </div>

      {event.weather && (
        <section className="sect">
          <header className="sect-head">
            <span>Weather Forecast</span>
            <span className="jp">天候予報</span>
          </header>
          <div className="wx-panel">
            <div className="wx-item">
              <div className="wx-k">Temp</div>
              <div className="wx-v">{event.weather.temp}°</div>
            </div>
            <div className="wx-item">
              <div className="wx-k">Wind</div>
              <div className="wx-v ok">
                {event.weather.wind}
                <span style={{ fontSize: 10, color: 'var(--text-3)' }}> m/s</span>
              </div>
            </div>
            <div className="wx-item">
              <div className="wx-k">Vis</div>
              <div className="wx-v ok" style={{ fontSize: 13 }}>
                {event.weather.visibility}
              </div>
            </div>
            <div className="wx-item">
              <div className="wx-k">Hum</div>
              <div className="wx-v">{event.weather.humidity}%</div>
            </div>
          </div>
        </section>
      )}

      <section className="sect">
        <header className="sect-head">
          <span>Programme</span>
          <span className="jp">演目</span>
        </header>
        <div className="row">
          <span className="l">振付</span>
          <span className="v">東京湾の星座 v2.4</span>
        </div>
        <div className="row">
          <span className="l">フォーメーション</span>
          <span className="v">9 formations</span>
        </div>
        <div className="row">
          <span className="l">音楽</span>
          <span className="v">宵の口 — 久石譲 (120 BPM)</span>
        </div>
        <div className="row">
          <span className="l">花火同期</span>
          <span className="v">あり · 3箇所</span>
        </div>
      </section>

      <section className="sect">
        <header className="sect-head">
          <span>Crew · {CREW.length} people</span>
          <span className="jp">当日クルー</span>
        </header>
        {CREW.map((c) => (
          <div key={c.name} className="crew-row">
            <span className="crew-ava" aria-hidden="true" style={{ background: c.color }}>
              {c.initials}
            </span>
            <div className="crew-info">
              <div className="crew-name">{c.name}</div>
              <div className="crew-role">{c.role}</div>
            </div>
            <div
              className="crew-status"
              style={{ color: c.status === 'CONFIRMED' ? 'var(--ok)' : 'var(--warn)' }}
            >
              {c.status}
            </div>
          </div>
        ))}
      </section>

      <section className="sect">
        <header className="sect-head">
          <span>Pre-flight State</span>
          <span className="jp">出発準備状況</span>
        </header>
        <div className="pf-grid">
          {preflight.map((it) => (
            <div key={it.label} className={`pf-item ${it.ok ? 'ok' : 'warn'}`}>
              <div className="pf-label">{it.label}</div>
              <div className="pf-value">{it.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="sect">
        <header className="sect-head">
          <span>Pre-flight Checklist</span>
          <span className="jp">離陸前確認</span>
        </header>
        <div className="checklist" role="list">
          {checklist.map((ci, i) => (
            <button
              type="button"
              key={ci.label}
              role="checkbox"
              aria-checked={ci.done}
              className={`check-item ${ci.done ? 'done' : ''}`}
              onClick={() => toggleCheck(i)}
            >
              <span
                className={`check-box ${ci.done ? 'on' : ''} ${ci.warn ? 'warn' : ''}`}
                aria-hidden="true"
              >
                {ci.done ? '✓' : ci.warn ? '!' : ''}
              </span>
              <span style={{ flex: 1 }}>
                <span>{ci.label}</span>
                {ci.note && (
                  <span
                    style={{
                      display: 'block',
                      fontSize: 10,
                      color: 'var(--text-3)',
                      fontFamily: 'var(--mono)',
                      letterSpacing: '0.04em',
                      marginTop: 2,
                    }}
                  >
                    {ci.note}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 11,
            color: 'var(--text-3)',
            fontFamily: 'Poppins, sans-serif',
            letterSpacing: '0.14em',
          }}
        >
          {checklist.filter((c) => c.done).length} / {checklist.length} 完了
        </div>
      </section>
    </aside>
  );
}
