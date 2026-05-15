import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Calendar } from './Calendar';

const noop = () => {};

describe('<Calendar>', () => {
  it('renders the month label and DOW headers', () => {
    render(
      <Calendar
        year={2026}
        monthIndex={3}
        selectedDate="2026-04-28"
        todayKey="2026-04-19"
        onPrev={noop}
        onToday={noop}
        onNext={noop}
        onSelect={noop}
      />
    );
    expect(screen.getByRole('heading', { name: /2026年 4月/ })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(7);
  });

  it('marks the selected day with aria-current=date', () => {
    render(
      <Calendar
        year={2026}
        monthIndex={3}
        selectedDate="2026-04-28"
        todayKey="2026-04-19"
        onPrev={noop}
        onToday={noop}
        onNext={noop}
        onSelect={noop}
      />
    );
    const selected = screen.getByRole('gridcell', { name: /2026-04-28: 東京湾の星座/ });
    expect(selected).toHaveAttribute('aria-current', 'date');
  });

  it('fires onPrev / onNext when the arrows are clicked', async () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <Calendar
        year={2026}
        monthIndex={3}
        selectedDate="2026-04-28"
        todayKey="2026-04-19"
        onPrev={onPrev}
        onToday={noop}
        onNext={onNext}
        onSelect={noop}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: '前の月' }));
    await userEvent.click(screen.getByRole('button', { name: '次の月' }));
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
