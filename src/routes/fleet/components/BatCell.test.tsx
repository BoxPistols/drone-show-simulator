import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BatCell } from './BatCell';

describe('<BatCell>', () => {
  it('renders the percentage value', () => {
    render(<BatCell v={73} />);
    expect(screen.getByText('73%')).toBeInTheDocument();
  });

  it('exposes an aria-label that mirrors the value', () => {
    render(<BatCell v={42} />);
    expect(screen.getByLabelText('バッテリー 42%')).toBeInTheDocument();
  });
});
