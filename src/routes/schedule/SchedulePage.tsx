import { useState } from 'react';
import { useToast } from '~/hooks/useToast';
import { CREW, EVENTS } from '~/data/schedule';
import { Calendar } from './components/Calendar';
import { EventDrawer } from './components/EventDrawer';
import './schedule.css';

const TODAY_KEY = '2026-04-19';

export function SchedulePage() {
  const [year, setYear] = useState(2026);
  const [monthIndex, setMonthIndex] = useState(3);
  const [selDate, setSelDate] = useState('2026-04-28');
  const { show: showToast } = useToast();

  const goPrevMonth = () => {
    if (monthIndex === 0) {
      setMonthIndex(11);
      setYear((y) => y - 1);
    } else setMonthIndex((m) => m - 1);
  };
  const goNextMonth = () => {
    if (monthIndex === 11) {
      setMonthIndex(0);
      setYear((y) => y + 1);
    } else setMonthIndex((m) => m + 1);
  };
  const goToday = () => {
    setYear(2026);
    setMonthIndex(3);
    setSelDate('2026-04-19');
    showToast('今日 (2026-04-19) に移動');
  };

  const onInviteCrew = () => showToast(`クルー ${String(CREW.length)} 名に招集通知を送信 (mock)`);
  const onExportCsv = () => {
    const header = 'date,type,title,venue,time,duration,drones,audience';
    const rows = Object.entries(EVENTS).map(([d, e]) =>
      [
        d,
        e.type,
        e.title,
        e.venue,
        e.time,
        e.duration ?? '',
        e.drones ?? '',
        e.audience ?? '',
      ].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'astra-flock-schedule.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`CSV 書出: ${String(rows.length)} 公演 → astra-flock-schedule.csv`);
  };
  const onAddEvent = () => showToast('新規公演フォーム (mock) — 未接続');

  const selEvent = EVENTS[selDate];

  return (
    <main className="sc-main" aria-label="運航スケジュール">
      <header className="sc-head">
        <div>
          <h1 className="jp" style={{ margin: 0 }}>
            運航スケジュール
          </h1>
          <div className="en">Flight Schedule — Spring Season 2026</div>
        </div>
        <div className="sc-actions">
          <button type="button" className="sc-btn" onClick={onInviteCrew}>
            クルー招集
          </button>
          <button type="button" className="sc-btn" onClick={onExportCsv}>
            CSV書出
          </button>
          <button type="button" className="sc-btn primary" onClick={onAddEvent}>
            + 公演を追加
          </button>
        </div>
      </header>

      <div className="sc-body">
        <Calendar
          year={year}
          monthIndex={monthIndex}
          selectedDate={selDate}
          todayKey={TODAY_KEY}
          onPrev={goPrevMonth}
          onToday={goToday}
          onNext={goNextMonth}
          onSelect={setSelDate}
        />
        <EventDrawer date={selDate} event={selEvent} onAddEvent={onAddEvent} />
      </div>
    </main>
  );
}
