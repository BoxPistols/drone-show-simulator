import { useMemo } from 'react';
import { DOW_EN, DOW_JP, EVENTS, MONTH_EN, dateKey, type ScheduleEvent } from '~/data/schedule';

interface Cell {
  day: number;
  key: string;
  other: boolean;
}

interface Props {
  year: number;
  monthIndex: number;
  selectedDate: string;
  todayKey: string;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
  onSelect: (key: string) => void;
}

export function Calendar({
  year,
  monthIndex,
  selectedDate,
  todayKey,
  onPrev,
  onToday,
  onNext,
  onSelect,
}: Props) {
  const cells = useMemo<Cell[]>(() => {
    const first = new Date(year, monthIndex, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const prevDays = new Date(year, monthIndex, 0).getDate();
    const out: Cell[] = [];
    for (let i = 0; i < startDow; i++) {
      const day = prevDays - startDow + 1 + i;
      out.push({ day, key: dateKey(year, monthIndex - 1, day), other: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({ day: d, key: dateKey(year, monthIndex, d), other: false });
    }
    while (out.length % 7 !== 0) {
      const d = out.length - startDow - daysInMonth + 1;
      out.push({ day: d, key: dateKey(year, monthIndex + 1, d), other: true });
    }
    return out;
  }, [year, monthIndex]);

  const monthLabel = MONTH_EN[monthIndex] ?? '';

  return (
    <section
      className="sc-cal"
      aria-label={`${String(year)} 年 ${String(monthIndex + 1)} 月のカレンダー`}
    >
      <div className="cal-nav">
        <h2 className="cal-month" style={{ margin: 0 }}>
          {year}年 {monthIndex + 1}月<span className="en">{monthLabel}</span>
        </h2>
        <div className="cal-arrows">
          <button
            type="button"
            className="cal-arr"
            onClick={onPrev}
            aria-label="前の月"
            title="前の月"
          >
            ‹
          </button>
          <button type="button" className="cal-arr" onClick={onToday} title="今月">
            今月
          </button>
          <button
            type="button"
            className="cal-arr"
            onClick={onNext}
            aria-label="次の月"
            title="次の月"
          >
            ›
          </button>
        </div>
      </div>
      <div className="cal-grid" role="grid" aria-label="日付グリッド">
        {/* role=row wrappers use display:contents so the CSS grid layout
            is preserved while satisfying axe-core's aria-required-children. */}
        <div role="row" style={{ display: 'contents' }}>
          {DOW_JP.map((d, i) => (
            <div
              key={d}
              role="columnheader"
              className={`cal-dow ${i === 0 ? 'sun' : ''} ${i === 6 ? 'sat' : ''}`}
            >
              {d} · {DOW_EN[i]}
            </div>
          ))}
        </div>
        {Array.from({ length: Math.ceil(cells.length / 7) }, (_, rowIdx) => (
          <div role="row" style={{ display: 'contents' }} key={`row-${String(rowIdx)}`}>
            {cells.slice(rowIdx * 7, rowIdx * 7 + 7).map((c, i) => {
              const ev: ScheduleEvent | undefined = EVENTS[c.key];
              const isToday = c.key === todayKey;
              const isSel = c.key === selectedDate;
              return (
                <button
                  type="button"
                  role="gridcell"
                  key={`${c.key}-${String(rowIdx * 7 + i)}`}
                  className={`cal-cell ${c.other ? 'other' : ''} ${isToday ? 'today' : ''} ${isSel ? 'selected' : ''}`}
                  onClick={() => {
                    if (!c.other) onSelect(c.key);
                  }}
                  disabled={c.other}
                  aria-current={isSel ? 'date' : undefined}
                  aria-label={`${c.key}${ev ? `: ${ev.title}` : ''}`}
                >
                  <span className="cal-day">{c.day}</span>
                  {ev && (
                    <span className="cal-events">
                      <span className={`cal-ev ${ev.type}`}>
                        {ev.time} · {ev.title}
                      </span>
                    </span>
                  )}
                  {ev?.type === 'show' && (
                    <span className="cal-weather" title="晴れ" aria-hidden="true">
                      ☾
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
