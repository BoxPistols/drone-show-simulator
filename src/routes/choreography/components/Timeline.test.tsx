import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FORMATIONS } from '~/lib/formations';
import { makeEditable, startTimes, totalDuration } from '../store';
import { Timeline } from './Timeline';

const formations = [makeEditable(FORMATIONS[0]!, 'a'), makeEditable(FORMATIONS[1]!, 'b')].map(
  (f, i) => ({ ...f, dur: i === 0 ? 20 : 40 })
);
const starts = startTimes(formations);
const totalDur = totalDuration(formations);

function renderTimeline(over: Partial<React.ComponentProps<typeof Timeline>> = {}) {
  const props = {
    formations,
    starts,
    totalDur,
    selectedIndex: 0,
    time: 0,
    bpm: 120,
    onSelect: vi.fn(),
    onSeek: vi.fn(),
    onSetDur: vi.fn(),
    ...over,
  };
  return { ...render(<Timeline {...props} />), props };
}

describe('<Timeline>', () => {
  it('draws one beat line per beat and marks every 4th as a bar', () => {
    const { container } = renderTimeline();
    // 60 秒 × 2 拍/秒 = 120 拍 + 0 拍目
    expect(container.querySelectorAll('.tl-beat')).toHaveLength(121);
    expect(container.querySelectorAll('.tl-beat.bar')).toHaveLength(31);
  });

  it('draws no beat grid when bpm is 0', () => {
    const { container } = renderTimeline({ bpm: 0 });
    expect(container.querySelectorAll('.tl-beat')).toHaveLength(0);
  });

  it('keeps the same beat elements when only the playhead moves (memoized grid)', () => {
    const { container, rerender, props } = renderTimeline({ time: 1 });
    const before = Array.from(container.querySelectorAll('.tl-beat'));
    rerender(<Timeline {...props} time={30} />);
    const after = Array.from(container.querySelectorAll('.tl-beat'));
    expect(after).toEqual(before);
    expect(container.querySelector('.tl-playhead')).toHaveStyle({ left: '50%' });
  });

  it('clicking a block selects it and seeks just past its start', async () => {
    const { getByRole, props } = renderTimeline();
    await userEvent.click(getByRole('button', { name: /^2: / }));
    expect(props.onSelect).toHaveBeenCalledWith(1);
    expect(props.onSeek).toHaveBeenCalledWith(20.01);
  });
});
