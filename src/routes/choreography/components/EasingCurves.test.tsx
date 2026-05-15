import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EasingCurves } from './EasingCurves';
import { EASING_NAMES } from '~/types/formations';

describe('<EasingCurves>', () => {
  it('renders one radio per easing curve', () => {
    render(<EasingCurves selected="Ease-both" onChange={() => {}} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(EASING_NAMES.length);
  });

  it('marks the selected curve with aria-checked', () => {
    render(<EasingCurves selected="Elastic" onChange={() => {}} />);
    const elastic = screen.getByRole('radio', { name: 'Elastic' });
    expect(elastic).toHaveAttribute('aria-checked', 'true');
    const linear = screen.getByRole('radio', { name: 'Linear' });
    expect(linear).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange with the clicked easing name', async () => {
    const onChange = vi.fn();
    render(<EasingCurves selected="Linear" onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Ease-out' }));
    expect(onChange).toHaveBeenCalledWith('Ease-out');
  });

  it('exposes a radiogroup landmark', () => {
    render(<EasingCurves selected="Linear" onChange={() => {}} />);
    expect(screen.getByRole('radiogroup', { name: '補間曲線' })).toBeInTheDocument();
  });
});
