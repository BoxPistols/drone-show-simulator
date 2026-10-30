import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AudioMeta } from '../hooks/useAudio';
import { WaveformBar } from './WaveformBar';

const audio: AudioMeta = {
  name: 'track.mp3',
  duration: 100,
  samples: Array.from({ length: 200 }, (_, i) => (i % 10) / 10),
  buffer: {} as AudioBuffer,
};

describe('<WaveformBar>', () => {
  it('draws 200 placeholder bars and no progress layer without audio', () => {
    const { container } = render(
      <WaveformBar audio={null} time={30} totalDur={100} onSeek={() => {}} />
    );
    expect(container.querySelectorAll('rect').length).toBe(200);
    expect(container.querySelectorAll('clipPath')).toHaveLength(0);
  });

  it('with audio, progress is a single clip rect whose width follows time', () => {
    const { container, rerender } = render(
      <WaveformBar audio={audio} time={25} totalDur={100} onSeek={() => {}} />
    );
    const clip = container.querySelector('clipPath rect');
    expect(clip).toHaveAttribute('width', '200');
    // 200 本 × 2 層 + クリップ矩形
    expect(container.querySelectorAll('rect').length).toBe(401);
    rerender(<WaveformBar audio={audio} time={50} totalDur={100} onSeek={() => {}} />);
    expect(container.querySelector('clipPath rect')).toHaveAttribute('width', '400');
  });

  it('clicking seeks proportionally to the click position', async () => {
    const onSeek = vi.fn();
    const { getByRole } = render(
      <WaveformBar audio={audio} time={0} totalDur={100} onSeek={onSeek} />
    );
    const track = getByRole('slider');
    track.getBoundingClientRect = () =>
      ({ left: 0, width: 400, top: 0, height: 36, right: 400, bottom: 36 }) as DOMRect;
    await userEvent.pointer({
      target: track,
      coords: { clientX: 100, clientY: 10 },
      keys: '[MouseLeft]',
    });
    expect(onSeek).toHaveBeenCalledWith(25);
  });
});
