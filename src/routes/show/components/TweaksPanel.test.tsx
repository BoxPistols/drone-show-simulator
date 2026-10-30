import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFS } from '../types';
import { TweaksPanel } from './TweaksPanel';

function renderPanel(over: Partial<React.ComponentProps<typeof TweaksPanel>> = {}) {
  const props = {
    open: true,
    prefs: DEFAULT_PREFS,
    formationIndex: 0,
    onClose: vi.fn(),
    onPaletteChange: vi.fn(),
    onSkyChange: vi.fn(),
    onToggle: vi.fn(),
    onSizeChange: vi.fn(),
    onSeekFormation: vi.fn(),
    povIndex: -1,
    onCameraChange: vi.fn(),
    onNextPov: vi.fn(),
    onVolumeChange: vi.fn(),
    ...over,
  };
  return { ...render(<TweaksPanel {...props} />), props };
}

describe('<TweaksPanel>', () => {
  it('exposes the lite-mode switch with its explanation and reports toggles', async () => {
    const { props } = renderPanel();
    const lite = screen.getByRole('switch', { name: /軽量モード/ });
    expect(lite).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText(/解像度を抑え/)).toBeInTheDocument();
    await userEvent.click(lite);
    expect(props.onToggle).toHaveBeenCalledWith('lite');
  });

  it('reflects the effective prefs (auto lite shows as on)', () => {
    renderPanel({ prefs: { ...DEFAULT_PREFS, lite: true, trails: true } });
    expect(screen.getByRole('switch', { name: /軽量モード/ })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByRole('switch', { name: /残像/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('lists all 9 formations and seeks on click', async () => {
    const { props } = renderPanel({ formationIndex: 2 });
    const buttons = screen.getAllByRole('button', {
      name: /球体|単螺旋|円環|波紋|熊|二重螺旋|立方体|心臓|銀河/,
    });
    expect(buttons).toHaveLength(9);
    expect(buttons[2]).toHaveClass('active');
    await userEvent.click(buttons[8]!);
    expect(props.onSeekFormation).toHaveBeenCalledWith(8);
  });

  it('is hidden from assistive tech when closed but stays in the DOM', () => {
    const { container } = renderPanel({ open: false });
    const panel = container.querySelector('#tweaks-panel');
    expect(panel).toHaveAttribute('aria-hidden', 'true');
    expect(panel).not.toHaveClass('open');
  });

  it('offers the three camera modes as a radio group and reports the choice', async () => {
    const { props } = renderPanel();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(screen.getByRole('radio', { name: /観客/ })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('radio', { name: /機体目線/ }));
    expect(props.onCameraChange).toHaveBeenCalledWith('drone');
    await userEvent.click(screen.getByRole('radio', { name: /360/ }));
    expect(props.onCameraChange).toHaveBeenCalledWith('fly');
  });

  it('in drone view shows which drone is used and lets you pick another', async () => {
    const { props } = renderPanel({ prefs: { ...DEFAULT_PREFS, camera: 'drone' }, povIndex: 41 });
    const next = screen.getByRole('button', { name: /別の機体へ/ });
    expect(next).toHaveTextContent('AS-042');
    await userEvent.click(next);
    expect(props.onNextPov).toHaveBeenCalledTimes(1);
    renderPanel({ prefs: DEFAULT_PREFS });
    expect(screen.queryAllByRole('button', { name: /別の機体へ/ })).toHaveLength(1);
  });

  it('music switch and volume slider report changes', async () => {
    const { props } = renderPanel({ prefs: { ...DEFAULT_PREFS, volume: 0.25 } });
    await userEvent.click(screen.getByRole('switch', { name: 'アンビエント音楽' }));
    expect(props.onToggle).toHaveBeenCalledWith('music');
    const slider = screen.getByRole('slider', { name: '音量' });
    expect(slider).toHaveValue('0.25');
    expect(screen.getByText('25%')).toBeInTheDocument();
  });
});
