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
});
