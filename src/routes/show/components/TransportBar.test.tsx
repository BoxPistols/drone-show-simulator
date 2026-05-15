import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TransportBar } from './TransportBar';

function defaults() {
  return {
    playing: true,
    speed: 1 as const,
    onPlayToggle: vi.fn(),
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onSpeedCycle: vi.fn(),
    onFullscreen: vi.fn(),
    onScreenshot: vi.fn(),
  };
}

describe('<TransportBar>', () => {
  it('renders a toolbar with all 6 controls', () => {
    render(<TransportBar {...defaults()} />);
    expect(screen.getByRole('toolbar', { name: /再生コントロール/ })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(6);
  });

  it('shows pause icon while playing and reflects aria-pressed', () => {
    render(<TransportBar {...defaults()} playing />);
    const play = screen.getByRole('button', { name: /一時停止/ });
    expect(play).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows play icon while paused (aria-label switches to 再生)', () => {
    render(<TransportBar {...defaults()} playing={false} />);
    expect(screen.getByRole('button', { name: '再生 (Space)' })).toBeInTheDocument();
  });

  it('forwards prev / next / play clicks', async () => {
    const props = defaults();
    render(<TransportBar {...props} />);
    await userEvent.click(screen.getByRole('button', { name: /前の演目/ }));
    await userEvent.click(screen.getByRole('button', { name: /次の演目/ }));
    await userEvent.click(screen.getByRole('button', { name: /一時停止/ }));
    expect(props.onPrev).toHaveBeenCalledTimes(1);
    expect(props.onNext).toHaveBeenCalledTimes(1);
    expect(props.onPlayToggle).toHaveBeenCalledTimes(1);
  });

  it('cycles speed forward on plain click', async () => {
    const props = defaults();
    render(<TransportBar {...props} />);
    await userEvent.click(screen.getByRole('button', { name: /再生速度/ }));
    expect(props.onSpeedCycle).toHaveBeenCalledWith(1);
  });
});
